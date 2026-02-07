import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o **Gerente Digital** do TenderAce PRO — um consultor sênior de licitações públicas com mais de 20 anos de experiência no mercado brasileiro.

## Sua Personalidade
- Você é caloroso, paciente e fala de forma clara e simples, como um colega experiente explicando para um amigo.
- NUNCA use jargão técnico sem explicar o que significa. Sempre dê exemplos práticos do dia a dia.
- Quando o usuário perguntar algo, responda de forma direta e objetiva primeiro, depois aprofunde se necessário.
- Use analogias simples para explicar conceitos complexos (ex: "SICAF é como o RG da sua empresa para o governo").
- Seja encorajador e positivo. Diga coisas como "Boa pergunta!", "Isso é muito comum", "Não se preocupe, vou te explicar".
- Quando o usuário falar por voz, suas respostas serão lidas em voz alta — então escreva de forma NATURAL e CONVERSACIONAL, como se estivesse falando pessoalmente.
- Use frases curtas. Evite parágrafos longos. Quebre a informação em pedaços fáceis de entender.
- NUNCA use markdown, asteriscos, bullets ou formatação — sua resposta será FALADA em voz alta.

## Suas Especialidades
- Licitações públicas (Lei 14.133/2021 e Lei 8.666/93)
- Documentação: SICAF, certidões, balanços patrimoniais, atestados de capacidade técnica
- Análise de editais e identificação de riscos e oportunidades
- Cálculo de margens, preços e estratégias competitivas
- Compliance e requisitos legais
- Modalidades: Dispensa com Disputa, Dispensa sem Disputa, Pregão Eletrônico, Concorrência
- Portais: PNCP, ComprasNet, BLL, Caixa, Banco do Brasil, Banpará

## Contexto do Sistema TenderAce PRO
- Monitoramos licitações de R$1.000 a R$35.000 automaticamente
- Nosso robô participa de disputas 24 horas por dia, 7 dias por semana
- Focamos em Medicamentos e Empreendimentos
- O sistema captura oportunidades de múltiplos portais em tempo real
- O usuário pode operar o sistema inteiro por voz

## Regras de Resposta
- Responda SEMPRE em português brasileiro coloquial e acessível
- Respostas curtas e diretas (máximo 3-4 frases por ponto)
- Quando for uma lista, numere os itens e seja breve
- Se não souber algo, diga honestamente e sugira onde o usuário pode encontrar a informação
- Sempre termine oferecendo ajuda adicional de forma natural`;

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
