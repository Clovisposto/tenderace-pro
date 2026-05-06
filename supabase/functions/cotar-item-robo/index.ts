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

    const { item_id } = await req.json();
    if (!item_id) return json({ success: false, error: 'item_id required' }, 400);

    const { data: item, error } = await supabase
      .from('licitacao_itens').select('*').eq('id', item_id).maybeSingle();
    if (error || !item) return json({ success: false, error: 'item não encontrado' }, 404);

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!GROQ_API_KEY) return json({ success: false, error: 'GROQ_API_KEY not configured' }, 200);
    if (!FIRECRAWL_API_KEY) return json({ success: false, error: 'FIRECRAWL_API_KEY not configured' }, 200);

    // 1) Scrape multiple Brazilian shopping sources using EDITAL ITEM description
    const queryRaw = (item.descricao || '').trim();
    const query = encodeURIComponent(queryRaw.slice(0, 180));

    const sources = [
      { name: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&hl=pt-BR&gl=br&q=${query}` },
      { name: 'Mercado Livre',   url: `https://lista.mercadolivre.com.br/${query}` },
      { name: 'Buscapé',          url: `https://www.buscape.com.br/search?q=${query}` },
    ];

    const scrapeOne = async (url: string) => {
      try {
        const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
          method: 'POST',
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url, formats: ['markdown'], onlyMainContent: false, waitFor: 2500,
            location: { country: 'BR', languages: ['pt-BR'] },
          }),
        });
        const d = await r.json();
        return d?.data?.markdown || d?.markdown || '';
      } catch { return ''; }
    };

    const results = await Promise.all(sources.map(s => scrapeOne(s.url)));
    let combined = '';
    sources.forEach((s, i) => {
      if (results[i] && results[i].length > 200) {
        combined += `\n\n===== FONTE: ${s.name} (${s.url}) =====\n${results[i].slice(0, 8000)}`;
      }
    });
    console.log('[cotar-item-robo] Combined bytes:', combined.length);

    if (combined.length < 300) {
      await supabase.from('licitacao_itens').update({
        preco_robo: null, robo_fontes: [], observacoes: 'NAO_ENCONTRADO',
      }).eq('id', item_id);
      return json({ success: true, nao_encontrado: true, error: 'Sem resultados nas fontes de cotação' });
    }

    const ctx = combined.slice(0, 24000);

    const aiResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é cotador de preços para licitações públicas brasileiras. Recebe o ITEM EXATO do edital (descrição, unidade, quantidade) e o conteúdo BRUTO de buscas no Google Shopping, Mercado Livre e Buscapé. Selecione 3 a 5 ofertas REAIS que correspondam à descrição do edital (mesmo produto, marca/modelo similares, mesma unidade). Priorize MENOR PREÇO entre as ofertas compatíveis. Use SOMENTE lojas/preços/URLs presentes no conteúdo — NUNCA invente. No campo "produto_encontrado" coloque o nome completo do produto da oferta. Calcule preco_medio_unitario como média dos preços selecionados. Retorne pela função quote_item.'
          },
          { role: 'user', content: `ITEM DO EDITAL:\nDescrição: ${item.descricao}\nUnidade: ${item.unidade}\nQuantidade: ${item.quantidade}\nPreço de referência (edital): ${item.preco_referencia ?? 'não informado'}\n\nCONTEÚDO DAS BUSCAS:\n${ctx}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'quote_item',
            description: 'Cotação do item',
            parameters: {
              type: 'object',
              properties: {
                preco_medio_unitario: { type: 'number' },
                fontes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      loja: { type: 'string' },
                      url: { type: 'string' },
                      preco: { type: 'number' },
                      endereco: { type: 'string' }
                    },
                    required: ['loja', 'preco']
                  }
                }
              },
              required: ['preco_medio_unitario', 'fontes']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'quote_item' } }
      })
    });

    if (aiResp.status === 429) return json({ success: false, fallback: true, error_code: 'RATE_LIMITED', error: 'Limite de IA' }, 200);
    if (aiResp.status === 402) return json({ success: false, fallback: true, error_code: 'AI_CREDITS_EXHAUSTED', error: 'Créditos de IA esgotados' }, 200);
    if (!aiResp.ok) return json({ success: false, error: `AI error ${aiResp.status}` }, 200);

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await supabase.from('licitacao_itens').update({
        preco_robo: null,
        robo_fontes: [],
        observacoes: 'NAO_ENCONTRADO',
      }).eq('id', item_id);
      return json({ success: true, nao_encontrado: true });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const precoRobo = result.preco_medio_unitario;
    const fontes = result.fontes || [];
    if (!precoRobo || precoRobo <= 0 || fontes.length === 0) {
      await supabase.from('licitacao_itens').update({
        preco_robo: null,
        robo_fontes: [],
        observacoes: 'NAO_ENCONTRADO',
      }).eq('id', item_id);
      return json({ success: true, nao_encontrado: true });
    }
    const ref = item.preco_referencia || precoRobo;
    const margem = ref ? ((ref - precoRobo) / ref) * 100 : null;

    await supabase.from('licitacao_itens').update({
      preco_robo: precoRobo,
      robo_fontes: fontes,
      custo_estimado: precoRobo,
      margem_lucro: margem,
      modo_cotacao: 'robo',
      preco_final: ref,
      observacoes: null,
    }).eq('id', item_id);

    return json({ success: true, preco_robo: precoRobo, margem, fontes });
  } catch (e: any) {
    console.error('cotar-item-robo error:', e);
    return json({ success: false, error: e.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
