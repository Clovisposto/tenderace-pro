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
    if (!LOVABLE_API_KEY) return json({ success: false, error: 'AI key not configured' }, 200);

    // Build prompt — try edital_url, else use objeto text
    const messages: any[] = [
      {
        role: 'system',
        content: 'Você é um especialista em editais de licitação brasileira. Extraia a lista de ITENS do edital. Retorne SOMENTE pela função extract_itens.'
      },
      {
        role: 'user',
        content: lic.edital_url
          ? `Analise este edital e extraia todos os itens. Edital: ${lic.edital_url}\n\nObjeto: ${lic.objeto}`
          : `Extraia os itens deste objeto de licitação:\n\n${lic.objeto}\n\nSe não houver itens explícitos, crie 1 item único representando o objeto inteiro.`
      }
    ];

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools: [{
          type: 'function',
          function: {
            name: 'extract_itens',
            description: 'Lista de itens da licitação',
            parameters: {
              type: 'object',
              properties: {
                itens: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      numero_item: { type: 'integer' },
                      descricao: { type: 'string' },
                      unidade: { type: 'string' },
                      quantidade: { type: 'number' },
                      preco_referencia: { type: 'number' }
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
    if (!aiResp.ok) return json({ success: false, error: `AI error ${aiResp.status}` }, 200);

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { itens: [] };
    let itens = args.itens || [];

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

    // Upsert items
    const rows = itens.map((i: any) => ({
      licitacao_id,
      numero_item: i.numero_item,
      descricao: i.descricao,
      unidade: i.unidade || 'UN',
      quantidade: i.quantidade,
      preco_referencia: i.preco_referencia || null,
    }));

    // Clear old then insert
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
