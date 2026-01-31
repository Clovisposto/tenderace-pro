import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Licitacao {
  id: string;
  numero: string;
  orgao: string;
  municipio: string;
  uf: string;
  objeto: string;
  valor: number;
  modalidade: string;
  data_abertura: string;
  data_limite: string;
  status: string;
  segmento: string;
  roi_score: number;
  risco_score: number;
}

interface AIAnalysis {
  id: string;
  ai_score: number;
  ai_priority: 'alta' | 'media' | 'baixa';
  ai_reasoning: string;
  estimated_success: number;
  recommended_action: string;
}

const SYSTEM_PROMPT = `Você é um especialista em análise de licitações públicas brasileiras com foco em ROI e gestão de riscos.

Analise as licitações fornecidas e retorne uma avaliação estruturada para cada uma.

Critérios de análise:
1. ROI Potencial (baseado em valor, modalidade, complexidade do objeto)
2. Risco (prazo, localização, requisitos técnicos)
3. Probabilidade de sucesso (histórico da modalidade, concorrência típica)
4. Adequação ao perfil (medicamentos ou empreendimentos)

Para cada licitação, forneça:
- ai_score: 0-100 (pontuação geral de atratividade)
- ai_priority: "alta" | "media" | "baixa"
- estimated_success: 0-100 (probabilidade de vencer)
- recommended_action: ação recomendada (ex: "Participar imediatamente", "Avaliar edital", "Monitorar apenas")
- ai_reasoning: breve justificativa (máx 100 caracteres)

Priorize licitações com:
- Maior valor dentro da faixa R$5.000-R$20.000 (sweet spot)
- Modalidade "Dispensa com Disputa" (menor concorrência)
- Prazo > 3 dias (tempo para preparação)
- Objeto alinhado com segmento da empresa`;

// SECURITY: Authenticate and authorize requests
async function authenticateRequest(req: Request, supabase: any): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Check if it's a service role token (for internal/scheduled calls)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (token === serviceRoleKey) {
    console.log("[Filtro IA] Service role authentication");
    return { authorized: true, userId: 'service_role' };
  }

  // Verify user token using getClaims for efficiency
  try {
    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !data?.claims?.sub) {
      console.error("[Filtro IA] Token verification failed:", claimsError?.message);
      return { authorized: false, error: 'Invalid authentication token' };
    }

    console.log("[Filtro IA] User authenticated:", data.claims.sub);
    return { authorized: true, userId: data.claims.sub };
  } catch (err) {
    console.error("[Filtro IA] Auth error:", err);
    return { authorized: false, error: 'Authentication failed' };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Authenticate request before processing
    const authResult = await authenticateRequest(req, supabase);
    
    if (!authResult.authorized) {
      console.warn("[Filtro IA] Unauthorized request blocked");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authResult.error || 'Unauthorized' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { licitacoes, segmento, limit = 20 } = await req.json();

    // If no licitacoes provided, fetch from database
    let targetLicitacoes: Licitacao[] = licitacoes;
    
    if (!targetLicitacoes || targetLicitacoes.length === 0) {
      console.log("[Filtro IA] Buscando licitações do banco...");
      
      let query = supabase
        .from('licitacoes')
        .select('*')
        .in('status', ['Nova', 'Em Análise', 'Aguardando Autorização'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (segmento) {
        query = query.eq('segmento', segmento);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("[Filtro IA] Erro ao buscar licitações:", error);
        throw error;
      }

      targetLicitacoes = data || [];
    }

    if (targetLicitacoes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          analyzed: [],
          message: "Nenhuma licitação para analisar" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Filtro IA] Analisando ${targetLicitacoes.length} licitações com IA...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback to algorithmic scoring if no AI key
      console.log("[Filtro IA] Usando scoring algorítmico (sem API key)...");
      const analyzed = targetLicitacoes.map(l => algorithmicScore(l));
      const sorted = analyzed.sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0)).slice(0, limit);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          analyzed: sorted,
          method: 'algorithmic',
          total: targetLicitacoes.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare licitacoes summary for AI
    const licitacoesForAI = targetLicitacoes.slice(0, 20).map(l => ({
      id: l.id,
      objeto: l.objeto.substring(0, 200),
      valor: l.valor,
      modalidade: l.modalidade,
      uf: l.uf,
      municipio: l.municipio,
      segmento: l.segmento,
      dias_restantes: Math.floor((new Date(l.data_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      roi_score: l.roi_score,
      risco_score: l.risco_score,
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `Analise estas licitações e retorne APENAS um array JSON com a análise de cada uma:\n\n${JSON.stringify(licitacoesForAI, null, 2)}`
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_tenders",
              description: "Retorna análise estruturada das licitações",
              parameters: {
                type: "object",
                properties: {
                  analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        ai_score: { type: "number", minimum: 0, maximum: 100 },
                        ai_priority: { type: "string", enum: ["alta", "media", "baixa"] },
                        estimated_success: { type: "number", minimum: 0, maximum: 100 },
                        recommended_action: { type: "string" },
                        ai_reasoning: { type: "string" }
                      },
                      required: ["id", "ai_score", "ai_priority", "estimated_success", "recommended_action", "ai_reasoning"]
                    }
                  }
                },
                required: ["analyses"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_tenders" } },
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      console.error("[Filtro IA] AI Gateway error:", response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", success: false }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes", success: false }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback to algorithmic
      const analyzed = targetLicitacoes.map(l => algorithmicScore(l));
      const sorted = analyzed.sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0)).slice(0, limit);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          analyzed: sorted,
          method: 'algorithmic_fallback',
          total: targetLicitacoes.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[Filtro IA] Resposta da IA recebida");

    // Extract tool call result
    let aiAnalyses: AIAnalysis[] = [];
    
    try {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        aiAnalyses = parsed.analyses || [];
      }
    } catch (parseError) {
      console.error("[Filtro IA] Erro ao parsear resposta:", parseError);
    }

    // Merge AI analysis with original licitacoes
    const analyzedLicitacoes = targetLicitacoes.map(l => {
      const aiData = aiAnalyses.find(a => a.id === l.id);
      
      if (aiData) {
        return {
          ...l,
          ai_score: aiData.ai_score,
          ai_priority: aiData.ai_priority,
          ai_reasoning: aiData.ai_reasoning,
          estimated_success: aiData.estimated_success,
          recommended_action: aiData.recommended_action,
        };
      }
      
      // Fallback for non-analyzed items
      const fallback = algorithmicScore(l);
      return { ...l, ...fallback };
    });

    // Sort by AI score and return top results
    const sorted = analyzedLicitacoes
      .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
      .slice(0, limit);

    console.log(`[Filtro IA] Retornando ${sorted.length} licitações priorizadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analyzed: sorted,
        method: 'ai',
        total: targetLicitacoes.length,
        ai_analyzed: aiAnalyses.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Filtro IA] Erro:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro interno" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Algorithmic fallback scoring
function algorithmicScore(l: Licitacao): Partial<AIAnalysis> & { id: string } {
  let score = 50;
  
  // Value sweet spot (R$5k-R$20k gets bonus)
  if (l.valor >= 5000 && l.valor <= 20000) score += 15;
  else if (l.valor > 20000 && l.valor <= 30000) score += 5;
  else if (l.valor < 5000) score -= 5;
  
  // Modalidade preference
  if (l.modalidade === 'Dispensa com Disputa') score += 10;
  else if (l.modalidade === 'Compra Direta') score += 5;
  
  // Days remaining
  const diasRestantes = Math.floor((new Date(l.data_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diasRestantes >= 5) score += 10;
  else if (diasRestantes >= 3) score += 5;
  else if (diasRestantes < 2) score -= 10;
  
  // Use existing scores
  score += (l.roi_score || 50) * 0.2;
  score -= (l.risco_score || 50) * 0.1;
  
  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Determine priority
  let priority: 'alta' | 'media' | 'baixa' = 'baixa';
  if (score >= 75) priority = 'alta';
  else if (score >= 50) priority = 'media';
  
  // Determine action
  let action = 'Monitorar apenas';
  if (score >= 80) action = 'Participar imediatamente';
  else if (score >= 60) action = 'Avaliar edital';
  else if (score >= 40) action = 'Analisar riscos';
  
  return {
    id: l.id,
    ai_score: score,
    ai_priority: priority,
    estimated_success: Math.round(score * 0.8),
    recommended_action: action,
    ai_reasoning: `Score: ROI ${l.roi_score || 'N/A'}, Risco ${l.risco_score || 'N/A'}, Prazo ${diasRestantes}d`,
  };
}
