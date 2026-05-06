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
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!LOVABLE_API_KEY) return json({ success: false, error: 'LOVABLE_API_KEY not configured' }, 200);

    // 1) Try to fetch the edital content via Firecrawl when URL is present
    let editalText = '';
    if (lic.edital_url && FIRECRAWL_API_KEY) {
      try {
        const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
          method: 'POST',
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lic.edital_url, formats: ['markdown'], onlyMainContent: false }),
        });
        const d = await r.json();
        editalText = d?.data?.markdown || d?.markdown || '';
        console.log('[extrair-itens-edital] edital bytes:', editalText.length);
      } catch (e) {
        console.error('[extrair-itens-edital] firecrawl error:', e);
      }
    }

    const sourceText = editalText && editalText.length > 300
      ? editalText.slice(0, 30000)
      : (lic.objeto || '');

    // 2) Ask Lovable AI to extract EACH item/lote/grupo separately
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é especialista em editais de licitação brasileira (Lei 14.133/2021). Sua tarefa: extrair CADA ITEM, LOTE ou GRUPO do edital SEPARADAMENTE.

REGRAS OBRIGATÓRIAS:
1. NUNCA agrupe itens. Se o edital pede "5 cadeiras e 5 mesas", são 2 itens distintos: (a) Cadeira, qtde 5; (b) Mesa, qtde 5.
2. Se houver tabela de itens com colunas (item, descrição, unidade, qtde, valor unitário), extraia LINHA POR LINHA.
3. preco_referencia = preço UNITÁRIO de UM item (não o total). Se o edital trouxer apenas total, divida pela quantidade.
4. unidade = "UN", "PC", "KG", "M", "SERVIÇO", etc. Use exatamente como aparece no edital.
5. descricao = especificação completa do item (marca/modelo/dimensões/material quando houver).
6. numero_item = sequencial 1, 2, 3...
7. Retorne TODOS os itens. Não invente. Se realmente houver só 1 item agregado, retorne 1.

SEMPRE chame a função extract_itens.`
          },
          {
            role: 'user',
            content: `LICITAÇÃO ${lic.numero} — ${lic.orgao}\nObjeto: ${lic.objeto}\nValor total estimado: R$ ${lic.valor}\n\nCONTEÚDO DO EDITAL / OBJETO DETALHADO:\n${sourceText}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_itens',
            description: 'Lista detalhada de itens/lotes/grupos do edital',
            parameters: {
              type: 'object',
              properties: {
                itens: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      numero_item: { type: 'integer', description: 'Sequencial 1,2,3...' },
                      descricao: { type: 'string', description: 'Especificação completa' },
                      unidade: { type: 'string', description: 'UN, PC, KG, M, SERVIÇO...' },
                      quantidade: { type: 'number', description: 'Quantidade solicitada' },
                      preco_referencia: { type: 'number', description: 'Preço UNITÁRIO em BRL' }
                    },
                    required: ['numero_item', 'descricao', 'unidade', 'quantidade']
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
      const errText = await aiResp.text();
      console.error('[extrair-itens-edital] AI error', aiResp.status, errText);
      return json({ success: false, error: `AI error ${aiResp.status}` }, 200);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { itens: [] };
    let itens = args.itens || [];
    console.log('[extrair-itens-edital] itens extraídos:', itens.length);

    if (itens.length === 0) {
      itens = [{ numero_item: 1, descricao: (lic.objeto || '').substring(0, 500), unidade: 'UN', quantidade: 1, preco_referencia: lic.valor }];
    }

    // Distribute total value as preco_referencia only when truly missing
    const totalSemPreco = itens.filter((i: any) => !i.preco_referencia).length;
    if (totalSemPreco > 0 && lic.valor) {
      const usado = itens.reduce((s: number, i: any) => s + (i.preco_referencia ? i.preco_referencia * (i.quantidade || 1) : 0), 0);
      const restante = Math.max(0, lic.valor - usado);
      const qtdRestante = itens.filter((i: any) => !i.preco_referencia).reduce((s: number, i: any) => s + (i.quantidade || 1), 0);
      const unitario = qtdRestante > 0 ? restante / qtdRestante : 0;
      itens = itens.map((i: any) => i.preco_referencia ? i : { ...i, preco_referencia: unitario });
    }

    const rows = itens.map((i: any, idx: number) => ({
      licitacao_id,
      numero_item: i.numero_item || idx + 1,
      descricao: i.descricao,
      unidade: i.unidade || 'UN',
      quantidade: i.quantidade || 1,
      preco_referencia: i.preco_referencia || null,
    }));

    await supabase.from('licitacao_itens').delete().eq('licitacao_id', licitacao_id);
    const { error: insErr } = await supabase.from('licitacao_itens').insert(rows);
    if (insErr) return json({ success: false, error: insErr.message }, 500);

    await supabase.from('licitacoes').update({ itens_extraidos: true, enviado_para_cotacao: true }).eq('id', licitacao_id);

    return json({ success: true, total_itens: rows.length });
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
