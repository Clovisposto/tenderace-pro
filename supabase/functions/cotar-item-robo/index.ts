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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return json({ success: false, error: 'AI key not configured' }, 200);

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um robô de cotação. Pesquise o produto/serviço descrito em sites brasileiros (Mercado Livre, Amazon BR, Magazine Luiza, lojas especializadas, distribuidoras). Retorne APENAS pela função quote_item com 3 a 5 fontes reais com loja, URL completa e preço unitário em BRL.'
          },
          { role: 'user', content: `Cote este item:\n${item.descricao}\nUnidade: ${item.unidade}\nQuantidade: ${item.quantidade}` }
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
    const ref = item.preco_referencia || precoRobo;
    const margem = ref ? ((ref - precoRobo) / ref) * 100 : null;

    await supabase.from('licitacao_itens').update({
      preco_robo: precoRobo,
      robo_fontes: result.fontes,
      custo_estimado: precoRobo,
      margem_lucro: margem,
      modo_cotacao: 'robo',
      preco_final: ref,
    }).eq('id', item_id);

    return json({ success: true, preco_robo: precoRobo, margem, fontes: result.fontes });
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
