import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const auth = req.headers.get('Authorization');
    if (!auth) return json({ success: false, error: 'unauthorized' }, 401);
    const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (!user) return json({ success: false, error: 'unauthorized' }, 401);

    const { licitacao_id } = await req.json();
    if (!licitacao_id) return json({ success: false, error: 'licitacao_id required' }, 400);

    const { data: lic, error: licErr } = await supabase
      .from('licitacoes').select('*').eq('id', licitacao_id).maybeSingle();
    if (licErr || !lic) return json({ success: false, error: 'licitacao não encontrada' }, 404);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return json({ success: false, error: 'LOVABLE_API_KEY not configured' }, 200);

    // 1) Try to fetch the edital PDF and inline as base64 for Gemini Vision
    let pdfDataUrl: string | null = null;
    let pdfMime = 'application/pdf';
    if (lic.edital_url) {
      try {
        const r = await fetch(lic.edital_url);
        if (r.ok) {
          const ct = r.headers.get('content-type') || '';
          if (ct.includes('pdf') || lic.edital_url.toLowerCase().endsWith('.pdf')) {
            pdfMime = 'application/pdf';
          } else if (ct.includes('image')) {
            pdfMime = ct.split(';')[0];
          }
          const buf = new Uint8Array(await r.arrayBuffer());
          // chunked base64 to avoid stack overflow
          let bin = '';
          const CHUNK = 8192;
          for (let i = 0; i < buf.length; i += CHUNK) {
            bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
          }
          const b64 = btoa(bin);
          pdfDataUrl = `data:${pdfMime};base64,${b64}`;
          console.log(`[extrair-itens] PDF fetched, ${buf.length} bytes`);
        }
      } catch (e) {
        console.warn('[extrair-itens] failed to fetch edital_url', e);
      }
    }

    const systemMsg = `Você é especialista em editais de licitação brasileira (Lei 14.133/2021).
Extraia TODOS os itens da TABELA DE ITENS / RELAÇÃO DE ITENS do edital, um por um.
Para CADA linha da tabela retorne: número do item, descrição completa (com as especificações),
unidade (UN, KG, PAR, CX, etc.), quantidade exata e preço unitário de referência (em R$).
NÃO agrupe nem resuma. NÃO invente itens. Se houver 50 itens, retorne os 50.
Use SOMENTE a função extract_itens.`;

    const userContent: any[] = [
      {
        type: 'text',
        text: `Edital nº ${lic.numero} — Órgão: ${lic.orgao}\nObjeto: ${lic.objeto}\n\nExtraia a relação completa de itens.`
      }
    ];
    if (pdfDataUrl) {
      userContent.push({ type: 'image_url', image_url: { url: pdfDataUrl } });
    }

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userContent }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_itens',
            description: 'Lista completa de itens do edital — um objeto por linha da tabela',
            parameters: {
              type: 'object',
              properties: {
                itens: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      numero_item: { type: 'integer', description: 'Número/código do item conforme aparece no edital' },
                      descricao: { type: 'string', description: 'Descrição completa com especificações' },
                      unidade: { type: 'string', description: 'Unidade de medida (UN, KG, PAR, CX, M, L, etc.)' },
                      quantidade: { type: 'number' },
                      preco_referencia: { type: 'number', description: 'Valor unitário estimado em R$' }
                    },
                    required: ['numero_item', 'descricao', 'quantidade']
                  }
                }
              },
              required: ['itens']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_itens' } }
      })
    });

    if (aiResp.status === 429) return json({ success: false, fallback: true, error_code: 'RATE_LIMITED', error: 'Limite temporário de IA' }, 200);
    if (aiResp.status === 402) return json({ success: false, fallback: true, error_code: 'AI_CREDITS_EXHAUSTED', error: 'Créditos de IA esgotados' }, 200);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('[extrair-itens] AI error', aiResp.status, t);
      return json({ success: false, error: `AI error ${aiResp.status}` }, 200);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { itens: [] };
    let itens = args.itens || [];

    console.log(`[extrair-itens] AI returned ${itens.length} itens (pdf=${!!pdfDataUrl})`);

    if (itens.length === 0) {
      itens = [{ numero_item: 1, descricao: lic.objeto.substring(0, 500), unidade: 'UN', quantidade: 1, preco_referencia: lic.valor }];
    }

    // Distribute total value as preco_referencia if missing
    const totalSemPreco = itens.filter((i: any) => !i.preco_referencia).length;
    if (totalSemPreco > 0 && lic.valor) {
      const valorRestante = lic.valor - itens.reduce((s: number, i: any) => s + (i.preco_referencia ? i.preco_referencia * i.quantidade : 0), 0);
      const porItem = Math.max(0, valorRestante / totalSemPreco);
      itens = itens.map((i: any) => i.preco_referencia ? i : { ...i, preco_referencia: porItem / (i.quantidade || 1) });
    }

    const rows = itens.map((i: any) => ({
      licitacao_id,
      numero_item: i.numero_item,
      descricao: i.descricao,
      unidade: i.unidade || 'UN',
      quantidade: i.quantidade,
      preco_referencia: i.preco_referencia || null,
    }));

    await supabase.from('licitacao_itens').delete().eq('licitacao_id', licitacao_id);
    const { error: insErr } = await supabase.from('licitacao_itens').insert(rows);
    if (insErr) return json({ success: false, error: insErr.message }, 500);

    await supabase.from('licitacoes').update({ itens_extraidos: true, enviado_para_cotacao: true }).eq('id', licitacao_id);

    return json({ success: true, total_itens: rows.length, source: pdfDataUrl ? 'pdf+vision' : 'objeto-only' });
  } catch (e: any) {
    console.error('extrair-itens-edital error:', e);
    return json({ success: false, error: e.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
