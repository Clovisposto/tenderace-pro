import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVE_GW = 'https://connector-gateway.lovable.dev/google_drive/drive/v3';
const LOVABLE_AI = 'https://ai.gateway.lovable.dev/v1/chat/completions';

function gwHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    'X-Connection-Api-Key': Deno.env.get('GOOGLE_DRIVE_API_KEY')!,
    ...extra,
  };
}

async function gw(path: string, init: RequestInit = {}) {
  const res = await fetch(`${DRIVE_GW}${path}`, {
    ...init,
    headers: { ...gwHeaders({ 'Content-Type': 'application/json' }), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function ensureSicafFolder(): Promise<{ id: string; name: string }> {
  const q = encodeURIComponent(
    "name='SICAF' and mimeType='application/vnd.google-apps.folder' and trashed=false"
  );
  const found = await gw(`/files?q=${q}&fields=files(id,name)`);
  if (found.files?.length) return found.files[0];
  const created = await gw('/files?fields=id,name', {
    method: 'POST',
    body: JSON.stringify({ name: 'SICAF', mimeType: 'application/vnd.google-apps.folder' }),
  });
  return created;
}

async function downloadPdfBase64(fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_GW}/files/${fileId}?alt=media`, { headers: gwHeaders() });
  if (!res.ok) throw new Error(`download ${fileId} ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // base64 encode in chunks (avoid stack overflow)
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function extractWithAI(pdfBase64: string, fileName: string) {
  const prompt = `Você é um extrator de dados SICAF. Analise este PDF e retorne um JSON com TODAS as certidões e validades:
{
  "cnpj": "apenas dígitos (14)",
  "razao_social": "string",
  "sicaf_status": "regular" | "irregular" | "vencido",
  "sicaf_validade": "YYYY-MM-DD ou null (validade do credenciamento SICAF)",
  "certidoes": {
    "credenciamento_sicaf": { "validade": "YYYY-MM-DD", "status": "valido"|"vencido"|"ausente", "detalhe": "string" },
    "habilitacao_juridica": { "validade": null, "status": "valido"|"vencido"|"ausente", "detalhe": "string" },
    "receita_federal_pgfn": { "validade": "YYYY-MM-DD", "status": "valido"|"vencido"|"ausente", "detalhe": "string" },
    "fgts_crf": { "validade": "YYYY-MM-DD", "status": "valido"|"vencido"|"ausente", "detalhe": "string" },
    "trabalhista_tst": { "validade": "YYYY-MM-DD", "status": "valido"|"vencido"|"ausente", "detalhe": "string" },
    "receita_estadual": { "validade": "YYYY-MM-DD", "status": "valido"|"vencido"|"ausente", "detalhe": "string" },
    "receita_municipal": { "validade": "YYYY-MM-DD", "status": "valido"|"vencido"|"ausente", "detalhe": "string" },
    "qualificacao_economico_financeira": { "validade": "YYYY-MM-DD", "status": "valido"|"vencido"|"ausente", "detalhe": "string" }
  }
}
Use null em campos não encontrados. Arquivo: ${fileName}. Responda APENAS o JSON.`;

  const res = await fetch(LOVABLE_AI, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '{}';
  try { return JSON.parse(content); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'sync';

    if (!Deno.env.get('LOVABLE_API_KEY') || !Deno.env.get('GOOGLE_DRIVE_API_KEY')) {
      throw new Error('Google Drive não conectado');
    }

    if (action === 'list-folders') {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
      const data = await gw(`/files?q=${q}&fields=files(id,name,parents)&pageSize=200&orderBy=name`);
      return new Response(JSON.stringify({ folders: data.files || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'ensure-folder') {
      const folder = await ensureSicafFolder();
      return new Response(JSON.stringify({ folder }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        const files = data.files || [];
        const processed: any[] = [];

        // Get user companies once
        const { data: empresas } = await supabase
          .from('empresas')
          .select('id, cnpj, nome')
          .eq('user_id', cfg.user_id);

        for (const f of files.slice(0, 10)) {
          try {
            const pdfB64 = await downloadPdfBase64(f.id);
            const extracted = await extractWithAI(pdfB64, f.name);
            const cnpjDigits = String(extracted.cnpj || '').replace(/\D/g, '');
            const empresa = empresas?.find(
              (e) => String(e.cnpj || '').replace(/\D/g, '') === cnpjDigits
            );
            if (empresa && cnpjDigits.length === 14) {
              const certidoes = extracted.certidoes || {};
              const validadeIso = extracted.sicaf_validade ? new Date(extracted.sicaf_validade).toISOString() : null;
              const allValid = Object.values(certidoes).every((c: any) => !c || c.status === 'valido' || c.status == null);
              await supabase
                .from('empresas')
                .update({
                  sicaf_status: extracted.sicaf_status || 'regular',
                  sicaf_validade: validadeIso,
                  sicaf_atualizado_em: new Date().toISOString(),
                  certidoes,
                  certidoes_validas: extracted.sicaf_status === 'regular' && allValid,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', empresa.id);
              processed.push({ file: f.name, empresa: empresa.nome, ...extracted });
            } else {
              processed.push({ file: f.name, skipped: 'CNPJ não corresponde', cnpj: cnpjDigits });
            }
          } catch (fe: any) {
            processed.push({ file: f.name, error: fe.message });
          }
        }

        results.push({
          user_id: cfg.user_id,
          folder: cfg.folder_name,
          arquivos: files.length,
          processados: processed,
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
