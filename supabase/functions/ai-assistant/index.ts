import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Gerente Digital do TenderAce PRO, um assistente de IA especializado em licitações públicas brasileiras.

Suas capacidades incluem:
- Explicar processos de licitação (Lei 14.133/2021, Lei 8.666/93)
- Ajudar com documentação de habilitação (SICAF, certidões, balanços)
- Analisar editais e identificar riscos
- Calcular margens e preços competitivos
- Orientar sobre compliance e requisitos legais
- Explicar modalidades (Dispensa c/ Disputa, Dispensa s/ Disputa, Pregão)
- Auxiliar com estratégias de participação
- Responder sobre os portais: PNCP, ComprasNet, BLL, Caixa, Banco do Brasil

Contexto do sistema:
- Monitoramos licitações de R$1.000 a R$35.000
- Foco em Medicamentos e Empreendimentos
- Estados prioritários configuráveis pelo usuário
- Captura automática 24/7 de múltiplos portais

Seja conciso, profissional e sempre forneça informações precisas sobre licitações públicas.
Responda sempre em português brasileiro.`;

// Message validation
interface Message {
  role: string;
  content: string;
}

function isValidMessage(msg: unknown): msg is Message {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.role === 'string' &&
    (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
    typeof m.content === 'string'
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, stream = false } = body;

    // ====== INPUT VALIDATION ======
    
    // Validate messages is an array
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages deve ser um array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate array length
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages não pode estar vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Máximo de 50 mensagens permitido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (!isValidMessage(msg)) {
        return new Response(
          JSON.stringify({ error: `Mensagem ${i + 1} tem formato inválido` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate content length
      if (msg.content.length > 10000) {
        return new Response(
          JSON.stringify({ error: `Mensagem ${i + 1} muito longa (máximo 10000 caracteres)` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for empty content
      if (msg.content.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: `Mensagem ${i + 1} não pode estar vazia` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate stream parameter
    if (typeof stream !== 'boolean') {
      return new Response(
        JSON.stringify({ error: "stream deve ser um boolean" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== END INPUT VALIDATION ======
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("[AI Assistant] Processando mensagem...");

    // Sanitize messages for API call
    const sanitizedMessages = messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content.substring(0, 10000) // Enforce max length
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
          ...sanitizedMessages,
        ],
        stream: stream,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Assistant] Gateway error:", response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua solicitação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";

    console.log("[AI Assistant] Resposta gerada com sucesso");

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI Assistant] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
