// Busca documentos de habilitação no Google Drive por categoria/keywords
// e registra/atualiza na tabela documentos_habilitacao
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVE_GW = 'https://connector-gateway.lovable.dev/google_drive/drive/v3';

const KEYWORDS_BY_CATEGORIA: Record<string, string[]> = {
  proposta: ['proposta', 'comercial', 'lance'],
  juridica: ['contrato social', 'estatuto', 'cnpj', 'procuracao', 'identidade', 'juridica'],
  tecnica: ['atestado', 'capacidade tecnica', 'tecnica', 'crea', 'art', 'acervo'],
  economica: ['balanco', 'patrimonial', 'falencia', 'concordata', 'economica', 'financeira', 'dre'],
  fiscal_trabalhista: ['fgts', 'inss', 'tst', 'trabalhista', 'fiscal', 'receita', 'cnd', 'cndt', 'pgfn'],
  catalogo: ['catalogo', 'ficha tecnica', 'manual', 'especificacao', 'produto'],
};

function gwHeaders() {
  return {
    Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    'X-Connection-Api-Key': Deno.env.get('GOOGLE_DRIVE_API_KEY')!,
    'Content-Type': 'application/json',
  };
}

async function gw(path: string) {
  const res = await fetch(`${DRIVE_GW}${path}`, { headers: gwHeaders() });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!Deno.env.get('GOOGLE_DRIVE_API_KEY') || !Deno.env.get('LOVABLE_API_KEY')) {
      return new Response(JSON.stringify({ error: 'Google Drive não conectado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { categoria, licitacao_id, empresa_id, proposta_id, registrar = true, query } = body;

    if (!categoria || !KEYWORDS_BY_CATEGORIA[categoria]) {
      return new Response(JSON.stringify({ error: 'Categoria inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica empresa pertence ao user
    if (empresa_id) {
      const { data: emp } = await supabase
        .from('empresas').select('id').eq('id', empresa_id).eq('user_id', user.id).maybeSingle();
      if (!emp) {
        return new Response(JSON.stringify({ error: 'Empresa não autorizada' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const keywords = KEYWORDS_BY_CATEGORIA[categoria];
    const userQuery = query ? [String(query)] : [];
    const allTerms = [...userQuery, ...keywords];

    // Busca paralela: monta uma query OR no Drive
    const driveQ = allTerms
      .map((t) => `name contains '${t.replace(/'/g, "\\'")}'`)
      .join(' or ');
    const fullQ = `(${driveQ}) and trashed=false and mimeType!='application/vnd.google-apps.folder'`;

    const result = await gw(
      `/files?q=${encodeURIComponent(fullQ)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,parents)&pageSize=50&orderBy=modifiedTime desc`
    );
    const files = result.files || [];

    let registrados = 0;
    if (registrar && licitacao_id && empresa_id && files.length) {
      // Upsert por (proposta_id ou licitacao_id+empresa_id+drive_file_id+categoria)
      for (const f of files.slice(0, 20)) {
        // Verifica duplicata
        const { data: existing } = await supabase
          .from('documentos_habilitacao')
          .select('id')
          .eq('empresa_id', empresa_id)
          .eq('licitacao_id', licitacao_id)
          .eq('categoria', categoria)
          .eq('drive_file_id', f.id)
          .maybeSingle();

        if (existing) continue;

        const { error: insErr } = await supabase.from('documentos_habilitacao').insert({
          proposta_id: proposta_id || null,
          licitacao_id,
          empresa_id,
          categoria,
          nome: f.name,
          origem: 'drive',
          drive_file_id: f.id,
          drive_url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          mime_type: f.mimeType,
          tamanho_bytes: f.size ? Number(f.size) : null,
          status: 'pendente',
          metadata: { modifiedTime: f.modifiedTime },
        });
        if (!insErr) registrados++;
      }
    }

    return new Response(JSON.stringify({
      ok: true, total: files.length, registrados,
      arquivos: files.map((f: any) => ({
        id: f.id, name: f.name, mimeType: f.mimeType, size: f.size,
        modifiedTime: f.modifiedTime, url: f.webViewLink,
      })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('buscar-documentos-drive:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
