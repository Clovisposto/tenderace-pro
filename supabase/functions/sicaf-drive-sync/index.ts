import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVE_GW = 'https://connector-gateway.lovable.dev/google_drive/drive/v3';

async function gw(path: string, init: RequestInit = {}) {
  const res = await fetch(`${DRIVE_GW}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'X-Connection-Api-Key': Deno.env.get('GOOGLE_DRIVE_API_KEY')!,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'sync';

    if (!Deno.env.get('LOVABLE_API_KEY') || !Deno.env.get('GOOGLE_DRIVE_API_KEY')) {
      throw new Error('Google Drive não conectado');
    }

    // List folders for the picker
    if (action === 'list-folders') {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
      const data = await gw(`/files?q=${q}&fields=files(id,name,parents)&pageSize=200&orderBy=name`);
      return new Response(JSON.stringify({ folders: data.files || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sync: list PDFs in configured folder for each user and process
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: configs, error } = await supabase
      .from('sicaf_drive_config')
      .select('*')
      .eq('ativo', true);
    if (error) throw error;

    const results: any[] = [];
    for (const cfg of configs || []) {
      try {
        const q = encodeURIComponent(
          `'${cfg.folder_id}' in parents and mimeType='application/pdf' and trashed=false`
        );
        const data = await gw(
          `/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=50`
        );
        results.push({
          user_id: cfg.user_id,
          folder: cfg.folder_name,
          arquivos: (data.files || []).length,
          files: data.files,
        });
        await supabase
          .from('sicaf_drive_config')
          .update({ ultima_sincronizacao: new Date().toISOString() })
          .eq('id', cfg.id);
      } catch (e: any) {
        results.push({ user_id: cfg.user_id, error: e.message });
      }
    }

    await supabase.from('sicaf_refresh_log').insert({
      status: 'concluido',
      processadas: results.length,
      sucesso: results.filter((r) => !r.error).length,
      erros: results.filter((r) => r.error).length,
      resultados: results,
    });

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
