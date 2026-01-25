import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { editalTexto, licitacaoNumero, modalidade, valor, orgao } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Analisando edital para impugnação:', licitacaoNumero);

    const systemPrompt = `Você é um advogado especialista em licitações públicas brasileiras, com profundo conhecimento da Lei 14.133/2021 (Nova Lei de Licitações) e jurisprudência do TCU.

Sua função é analisar editais de licitação e identificar irregularidades que possam fundamentar uma impugnação administrativa ou recurso.

Analise cuidadosamente o edital buscando:
1. Restrições indevidas à competitividade
2. Exigências de qualificação técnica excessivas
3. Prazos inadequados para entrega de propostas
4. Critérios de julgamento subjetivos ou obscuros
5. Cláusulas abusivas ou inconstitucionais
6. Vícios formais que afetem a legalidade
7. Direcionamento a fornecedor específico
8. Exigências de amostras sem justificativa
9. Critérios de habilitação desproporcionais
10. Violações ao princípio da publicidade

Para cada irregularidade encontrada, forneça:
- Descrição clara do problema
- Fundamento legal (artigo da Lei 14.133/2021 ou outras normas)
- Jurisprudência do TCU se aplicável
- Sugestão de argumentação para impugnação
- Nível de gravidade (alta, média, baixa)`;

    const userPrompt = `Analise o seguinte edital de licitação:

NÚMERO: ${licitacaoNumero}
MODALIDADE: ${modalidade}
VALOR ESTIMADO: R$ ${valor?.toLocaleString('pt-BR')}
ÓRGÃO: ${orgao}

TEXTO DO EDITAL:
${editalTexto || 'Edital não disponível para análise completa. Realizar análise baseada nos dados disponíveis.'}

Forneça uma análise detalhada identificando possíveis irregularidades e fundamente cada ponto com a legislação aplicável. Se não houver texto do edital, analise os metadados disponíveis e indique verificações recomendadas.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'relatorio_impugnacao',
              description: 'Gera relatório estruturado de análise para impugnação',
              parameters: {
                type: 'object',
                properties: {
                  resumoGeral: {
                    type: 'string',
                    description: 'Resumo geral da análise do edital'
                  },
                  recomendacaoImpugnar: {
                    type: 'boolean',
                    description: 'Se recomenda impugnar ou não'
                  },
                  nivelRisco: {
                    type: 'string',
                    enum: ['baixo', 'medio', 'alto'],
                    description: 'Nível de risco de irregularidades'
                  },
                  irregularidades: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        titulo: { type: 'string' },
                        descricao: { type: 'string' },
                        fundamentoLegal: { type: 'string' },
                        jurisprudencia: { type: 'string' },
                        argumentacao: { type: 'string' },
                        gravidade: { type: 'string', enum: ['alta', 'media', 'baixa'] }
                      },
                      required: ['titulo', 'descricao', 'fundamentoLegal', 'gravidade']
                    }
                  },
                  modeloImpugnacao: {
                    type: 'string',
                    description: 'Modelo de texto para petição de impugnação'
                  },
                  prazoImpugnacao: {
                    type: 'string',
                    description: 'Prazo legal para impugnação conforme Lei 14.133/2021'
                  }
                },
                required: ['resumoGeral', 'recomendacaoImpugnar', 'nivelRisco', 'irregularidades']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'relatorio_impugnacao' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      throw new Error(`Erro na análise: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da IA recebida');

    let resultado;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      resultado = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback se não usar tool calling
      resultado = {
        resumoGeral: data.choices?.[0]?.message?.content || 'Análise não disponível',
        recomendacaoImpugnar: false,
        nivelRisco: 'baixo',
        irregularidades: [],
        prazoImpugnacao: '3 dias úteis antes da data de abertura (Art. 164 da Lei 14.133/2021)'
      };
    }

    console.log('Análise concluída:', resultado.nivelRisco);

    return new Response(
      JSON.stringify({
        success: true,
        analise: resultado,
        analisadoEm: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na análise de impugnação:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
