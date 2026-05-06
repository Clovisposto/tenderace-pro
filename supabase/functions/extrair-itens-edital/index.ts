import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

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

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) return json({ success: false, error: 'GROQ_API_KEY not configured' }, 200);

    // 1) Baixar PDF e extrair texto real (Groq não tem vision)
    let pdfText = '';
    if (lic.edital_url) {
      try {
        const r = await fetch(lic.edital_url);
        if (r.ok) {
          const buf = new Uint8Array(await r.arrayBuffer());
          const pdf = await getDocumentProxy(buf);
          const { text } = await extractText(pdf, { mergePages: true });
          pdfText = (text || '').toString();
          console.log(`[extrair-itens] PDF extraído: ${pdfText.length} chars, ${pdf.numPages} páginas`);
        } else {
          console.warn(`[extrair-itens] edital_url retornou ${r.status}`);
        }
      } catch (e) {
        console.warn('[extrair-itens] falha ao extrair texto do PDF:', e);
      }
    }

    // Se não conseguimos texto do edital, NÃO inventamos itens
    if (!pdfText || pdfText.trim().length < 200) {
      console.warn('[extrair-itens] PDF indisponível ou vazio — abortando para não alucinar');
      return json({
        success: false,
        error_code: 'EDITAL_INDISPONIVEL',
        error: 'Não foi possível ler o PDF do edital. Anexe o edital manualmente ou tente novamente.',
      }, 200);
    }

    // Limita texto enviado à IA (Groq llama 3.3 = 128k tokens, mas mantemos razoável)
    const MAX_CHARS = 60000;
    const editalTexto = pdfText.length > MAX_CHARS
      ? pdfText.slice(0, MAX_CHARS) + '\n\n[...texto truncado...]\n\n' + pdfText.slice(-10000)
      : pdfText;

    const systemMsg = `Você é especialista em editais de licitação brasileira (Lei 14.133/2021).
Sua tarefa é extrair APENAS os itens que constam EXPLICITAMENTE na TABELA / RELAÇÃO DE ITENS do edital fornecido.

REGRAS OBRIGATÓRIAS:
- NUNCA invente itens. Se não estiver no texto, NÃO retorne.
- Extraia EXATAMENTE como aparece: número, descrição completa, unidade, quantidade e valor unitário de referência.
- Uma linha da tabela = um item retornado. NÃO agrupe, NÃO resuma.
- Se o edital tiver 50 linhas, retorne 50 itens. Se tiver 1, retorne 1.
- Procure por seções como "RELAÇÃO DE ITENS", "OBJETO DETALHADO", "PLANILHA DE PREÇOS", "ANEXO I", "TERMO DE REFERÊNCIA".
- Se NÃO encontrar uma tabela de itens no texto, retorne lista vazia (itens: []).`;

    const userText = `EDITAL Nº ${lic.numero}
ÓRGÃO: ${lic.orgao}
OBJETO RESUMIDO: ${lic.objeto}

=== TEXTO COMPLETO DO EDITAL ===
${editalTexto}
=== FIM DO EDITAL ===

Extraia a relação completa e fiel de itens da tabela do edital acima. Use SOMENTE a função extract_itens.`;

    const aiResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userText }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_itens',
            description: 'Lista fiel dos itens encontrados no texto do edital — um objeto por linha da tabela',
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
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('[extrair-itens] AI error', aiResp.status, t);
      return json({ success: false, error: `AI error ${aiResp.status}` }, 200);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { itens: [] };
    let itens: any[] = args.itens || [];

    console.log(`[extrair-itens] IA retornou ${itens.length} itens`);

    // Validação anti-alucinação: descrição deve ter pelo menos algumas palavras presentes no PDF
    const normPdf = pdfText.toLowerCase().replace(/\s+/g, ' ');
    itens = itens.filter((it: any) => {
      const desc = (it.descricao || '').toLowerCase();
      if (!desc) return false;
      // Pega 4 palavras significativas (>3 chars) e exige que ao menos 2 estejam no PDF
      const palavras = desc.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 6);
      if (palavras.length === 0) return true;
      const matches = palavras.filter((p: string) => normPdf.includes(p)).length;
      return matches >= Math.min(2, palavras.length);
    });

    console.log(`[extrair-itens] Após validação anti-alucinação: ${itens.length} itens`);

    if (itens.length === 0) {
      return json({
        success: false,
        error_code: 'NENHUM_ITEM_ENCONTRADO',
        error: 'A IA não encontrou tabela de itens explícita no edital. Cadastre os itens manualmente.',
      }, 200);
    }

    // Distribui valor total apenas entre itens sem preço (mantém os que vieram corretos)
    const semPreco = itens.filter((i: any) => !i.preco_referencia);
    if (semPreco.length > 0 && lic.valor) {
      const totalCom = itens.reduce((s: number, i: any) => s + (i.preco_referencia ? Number(i.preco_referencia) * Number(i.quantidade || 1) : 0), 0);
      const restante = Math.max(0, Number(lic.valor) - totalCom);
      const porItem = restante / semPreco.length;
      itens = itens.map((i: any) => i.preco_referencia ? i : { ...i, preco_referencia: porItem / Number(i.quantidade || 1) });
    }

    const rows = itens.map((i: any, idx: number) => ({
      licitacao_id,
      numero_item: i.numero_item || (idx + 1),
      descricao: i.descricao,
      unidade: i.unidade || 'UN',
      quantidade: i.quantidade,
      preco_referencia: i.preco_referencia || null,
    }));

    await supabase.from('licitacao_itens').delete().eq('licitacao_id', licitacao_id);
    const { error: insErr } = await supabase.from('licitacao_itens').insert(rows);
    if (insErr) return json({ success: false, error: insErr.message }, 500);

    // Apenas marca itens_extraidos. NÃO move para Cotação aqui — isso só acontece via "Autorizar" (GATE_LEGAL).
    await supabase.from('licitacoes').update({ itens_extraidos: true }).eq('id', licitacao_id);

    return json({ success: true, total_itens: rows.length, source: 'pdf-text+groq' });
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
