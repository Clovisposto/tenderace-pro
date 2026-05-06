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

    // 1) Scrape Google Shopping (BR) for the item
    const query = encodeURIComponent(item.descricao.slice(0, 200));
    const shopUrl = `https://www.google.com/search?tbm=shop&hl=pt-BR&gl=br&q=${query}`;
    console.log('[cotar-item-robo] Scraping Google Shopping:', shopUrl);

    let shoppingMarkdown = '';
    try {
      const fcResp = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: shopUrl,
          formats: ['markdown'],
          onlyMainContent: true,
          location: { country: 'BR', languages: ['pt-BR'] },
        }),
      });
      const fcData = await fcResp.json();
      shoppingMarkdown = fcData?.data?.markdown || fcData?.markdown || '';
      console.log('[cotar-item-robo] Firecrawl bytes:', shoppingMarkdown.length);
    } catch (e) {
      console.error('[cotar-item-robo] Firecrawl error:', e);
    }

    if (!shoppingMarkdown || shoppingMarkdown.length < 100) {
      await supabase.from('licitacao_itens').update({
        preco_robo: null, robo_fontes: [], observacoes: 'NAO_ENCONTRADO',
      }).eq('id', item_id);
      return json({ success: true, nao_encontrado: true, error: 'Google Shopping sem resultados' });
    }

    // Truncate to keep token usage low
    const ctx = shoppingMarkdown.slice(0, 15000);

    const aiResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você extrai cotações reais do conteúdo bruto do Google Shopping (Brasil). Selecione APENAS as 3 a 5 LOJAS COM OS MENORES PREÇOS para o item solicitado. Use somente lojas/preços que aparecem no conteúdo fornecido — NÃO invente. Calcule preco_medio_unitario como a média dos preços mais baratos. Retorne via função quote_item.'
          },
          { role: 'user', content: `ITEM:\n${item.descricao}\nUnidade: ${item.unidade}\nQuantidade: ${item.quantidade}\n\nRESULTADOS GOOGLE SHOPPING (markdown):\n${ctx}` }
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
