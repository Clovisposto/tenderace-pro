import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licitacao_id, objeto, edital_url } = await req.json();

    if (!licitacao_id || !objeto) {
      return new Response(JSON.stringify({
        success: false,
        error: 'licitacao_id and objeto are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Edital Analysis] Starting analysis for licitacao: ${licitacao_id}`);

    let analysisResult;

    if (lovableApiKey) {
      // Use Lovable AI for analysis
      const systemPrompt = `Você é um especialista em análise de editais de licitação pública brasileira, com profundo conhecimento da Lei 14.133/2021.

Analise o objeto da licitação e forneça uma análise estruturada contendo:
1. Exigências prováveis (documentação, qualificação técnica, habilitação)
2. Critérios de julgamento (menor preço, técnica e preço, etc.)
3. Riscos potenciais (prazos apertados, penalidades severas, complexidade)
4. Penalidades contratuais típicas
5. Prazo de entrega estimado
6. Condições de pagamento prováveis

Responda SEMPRE em formato JSON válido.`;

      const userPrompt = `Analise o seguinte objeto de licitação e forneça exigências, critérios, riscos e penalidades típicas:

OBJETO: ${objeto}

${edital_url ? `URL do Edital: ${edital_url}` : 'Edital não disponível - analise baseado no objeto'}

Responda em JSON com a seguinte estrutura:
{
  "exigencias": ["exigência 1", "exigência 2", ...],
  "criterios": ["critério 1", "critério 2", ...],
  "riscos": ["risco 1", "risco 2", ...],
  "penalidades": ["penalidade 1", "penalidade 2", ...],
  "prazo_entrega": "descrição do prazo",
  "condicoes_pagamento": "descrição das condições",
  "local_entrega": "local provável",
  "observacoes": "observações adicionais"
}`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0]);
            console.log('[Edital Analysis] AI analysis successful');
          }
        } else {
          console.error('[Edital Analysis] AI API error:', aiResponse.status);
        }
      } catch (aiError) {
        console.error('[Edital Analysis] AI processing error:', aiError);
      }
    }

    // Fallback to rule-based analysis if AI fails
    if (!analysisResult) {
      console.log('[Edital Analysis] Using rule-based analysis');
      analysisResult = generateRuleBasedAnalysis(objeto);
    }

    // Save analysis to database
    const { error: insertError } = await supabase
      .from('analise_editais')
      .upsert({
        licitacao_id: licitacao_id,
        exigencias: analysisResult.exigencias || [],
        criterios: analysisResult.criterios || [],
        riscos: analysisResult.riscos || [],
        penalidades: analysisResult.penalidades || [],
        prazo_entrega: analysisResult.prazo_entrega || 'A definir pelo edital',
        condicoes_pagamento: analysisResult.condicoes_pagamento || 'Conforme edital',
        local_entrega: analysisResult.local_entrega || 'Local indicado no edital',
        observacoes: analysisResult.observacoes || null,
      }, { onConflict: 'licitacao_id' });

    if (insertError) {
      console.error('[Edital Analysis] Database error:', insertError);
      throw insertError;
    }

    // Update licitacao status
    await supabase
      .from('licitacoes')
      .update({ 
        edital_analisado: true,
        status: 'Em Análise'
      })
      .eq('id', licitacao_id);

    console.log(`[Edital Analysis] Analysis completed for ${licitacao_id}`);

    return new Response(JSON.stringify({
      success: true,
      licitacao_id,
      analysis: analysisResult,
      source: lovableApiKey ? 'ai' : 'rules'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Edital Analysis] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateRuleBasedAnalysis(objeto: string) {
  const lower = objeto.toLowerCase();
  const isMedicamento = ['medicamento', 'farmac', 'remédio', 'vacina', 'droga'].some(k => lower.includes(k));
  const isServico = ['serviço', 'manutenção', 'limpeza', 'conservação'].some(k => lower.includes(k));
  const isAlimento = ['alimento', 'cesta', 'gênero alimentício'].some(k => lower.includes(k));

  const exigenciasBase = [
    'Certidão Negativa de Débitos Federais',
    'Certidão de Regularidade FGTS',
    'Certidão Negativa de Débitos Trabalhistas',
    'Contrato Social ou Estatuto atualizado',
    'Prova de inscrição no CNPJ',
  ];

  const exigenciasEspecificas = [];
  const riscos = [];
  let prazoEntrega = '30 dias após emissão da ordem de compra';
  let localEntrega = 'Sede do órgão contratante';

  if (isMedicamento) {
    exigenciasEspecificas.push(
      'Licença de Funcionamento da Vigilância Sanitária',
      'Autorização de Funcionamento da ANVISA',
      'Certificado de Boas Práticas de Fabricação',
      'Registro ANVISA dos produtos',
      'Responsável Técnico habilitado'
    );
    riscos.push(
      'Medicamentos próximos ao vencimento',
      'Armazenamento inadequado durante transporte',
      'Não conformidade com registros ANVISA'
    );
    prazoEntrega = '15 a 30 dias, conforme urgência';
    localEntrega = 'Almoxarifado central de saúde ou farmácia do órgão';
  }

  if (isServico) {
    exigenciasEspecificas.push(
      'Comprovação de capacidade técnica',
      'Atestados de serviços similares',
      'Certidão de regularidade profissional'
    );
    riscos.push(
      'Descontinuidade do serviço',
      'Qualidade abaixo do esperado',
      'Problemas trabalhistas com funcionários terceirizados'
    );
    prazoEntrega = 'Execução contínua conforme contrato';
    localEntrega = 'Instalações do órgão contratante';
  }

  if (isAlimento) {
    exigenciasEspecificas.push(
      'Licença sanitária para manipulação de alimentos',
      'Registro no órgão de vigilância sanitária local'
    );
    riscos.push(
      'Produtos fora das especificações nutricionais',
      'Contaminação durante transporte'
    );
  }

  return {
    exigencias: [...exigenciasBase, ...exigenciasEspecificas],
    criterios: [
      'Menor preço por item ou lote',
      'Atendimento às especificações técnicas',
      'Prazo de entrega conforme edital',
      'Habilitação jurídica e fiscal completa'
    ],
    riscos: [
      ...riscos,
      'Prazos de entrega curtos',
      'Penalidades por atraso',
      'Variação cambial (se importado)'
    ],
    penalidades: [
      'Multa de 0,5% a 2% por dia de atraso',
      'Multa de até 20% por inexecução total',
      'Suspensão do direito de licitar por até 2 anos',
      'Declaração de inidoneidade em casos graves'
    ],
    prazo_entrega: prazoEntrega,
    condicoes_pagamento: 'Até 30 dias após entrega e aceite, mediante nota fiscal',
    local_entrega: localEntrega,
    observacoes: 'Análise automática baseada em regras. Recomenda-se leitura completa do edital.'
  };
}
