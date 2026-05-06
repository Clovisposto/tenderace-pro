import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras. Sua tarefa é analisar o documento do edital e determinar:

1. O MÉTODO DE ENVIO DA PROPOSTA: pode ser "portal" (envio eletrônico via sistema), "email" (envio por e-mail) ou "presencial" (entrega física).
2. Se for email, extrair o E-MAIL DE DESTINO para onde a proposta deve ser enviada.

ATENÇÃO ESPECIAL para identificar envio por e-mail:
- Procure por frases como: "enviar proposta para", "encaminhar para o email", "propostas devem ser enviadas para", "e-mail para cotação", "envio da proposta no e-mail", "ingresso do fornecedor", "enviar cotação para", "propostas no email"
- Qualquer endereço de e-mail mencionado como destino de propostas/cotações
- "Dispensa sem Disputa" e "Compra Direta" frequentemente aceitam email
- Se o edital diz que propostas devem ser enviadas por e-mail, o método é "email"

Para identificar portal:
- "Dispensa com Disputa" geralmente usa portal eletrônico
- Se mencionar sistema eletrônico (ComprasNet, BLL, PNCP, etc), é "portal"
- Se falar em "lances", "sessão pública virtual", é "portal"

Para identificar presencial:
- Se mencionar "sede do órgão", "protocolo físico", "entrega na secretaria", pode ser "presencial"

Responda APENAS em JSON válido, sem markdown e sem code blocks.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'AI não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { licitacao_id } = await req.json();

    if (!licitacao_id) {
      return new Response(JSON.stringify({ success: false, error: 'licitacao_id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: licitacao, error: fetchError } = await supabase
      .from('licitacoes')
      .select('*')
      .eq('id', licitacao_id)
      .single();

    if (fetchError || !licitacao) {
      return new Response(JSON.stringify({ success: false, error: 'Licitação não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Extrair Método] Processing: ${licitacao.numero}`);

    // Step 1: Try to download the PDF from PNCP
    const match = licitacao.numero.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
    let pdfBase64: string | null = null;
    let fallbackText = '';

    if (match && licitacao.portal === 'PNCP') {
      const [, cnpj, _tipo, sequencial, ano] = match;
      const apiUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
      
      console.log(`[Extrair Método] Fetching docs from: ${apiUrl}`);
      const docsResponse = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });

      if (docsResponse.ok) {
        const docs = await docsResponse.json();
        console.log(`[Extrair Método] Found ${Array.isArray(docs) ? docs.length : 0} documents`);

        if (Array.isArray(docs) && docs.length > 0) {
          const editalDoc = docs.find((d: any) => {
            const title = (d.titulo || d.nomeDocumento || '').toLowerCase();
            return title.includes('edital') || title.includes('termo de referência') || title.includes('aviso') || title.includes('dispensa');
          }) || docs[0];

          const docUrl = editalDoc.url || `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos/${editalDoc.sequencialDocumento}`;
          console.log(`[Extrair Método] Downloading: ${editalDoc.titulo || 'documento'}`);

          try {
            const pdfResponse = await fetch(docUrl);
            if (pdfResponse.ok) {
              const pdfBytes = await pdfResponse.arrayBuffer();
              console.log(`[Extrair Método] Downloaded ${Math.round(pdfBytes.byteLength / 1024)}KB`);
              
              // Limit to 5MB to keep within reasonable limits
              if (pdfBytes.byteLength <= 5 * 1024 * 1024) {
                pdfBase64 = arrayBufferToBase64(pdfBytes);
              } else {
                console.log(`[Extrair Método] PDF too large, using text fallback`);
              }
            }
          } catch (dlError) {
            console.error(`[Extrair Método] Download error:`, dlError);
          }

          // Document list for context
          fallbackText += 'Documentos disponíveis:\n';
          docs.forEach((d: any) => {
            fallbackText += `- ${d.titulo || d.nomeDocumento || 'Sem título'}\n`;
          });
        }
      }

      // Get contratacao details
      const detailUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`;
      try {
        const detailResponse = await fetch(detailUrl, { headers: { 'Accept': 'application/json' } });
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          fallbackText += `\nDetalhes PNCP:\n${JSON.stringify(detailData, null, 2).substring(0, 3000)}`;
        }
      } catch { /* ignore */ }
    }

    // Step 2: Single AI call - send PDF directly for analysis
    const userPrompt = `Analise este edital de licitação e determine o método de envio da proposta:

NÚMERO: ${licitacao.numero}
ÓRGÃO: ${licitacao.orgao}
MUNICÍPIO: ${licitacao.municipio}/${licitacao.uf}
MODALIDADE: ${licitacao.modalidade}
PORTAL: ${licitacao.portal}
OBJETO: ${licitacao.objeto}

${fallbackText}

Leia o documento PDF anexado com ATENÇÃO. Procure especificamente por menções a e-mail para envio de propostas.

Responda em JSON:
{
  "metodo_envio": "portal" | "email" | "presencial",
  "email_destino": "email@example.com ou null se não for email",
  "confianca": "alta" | "media" | "baixa",
  "justificativa": "cite o trecho exato do edital que indica o método de envio"
}`;

    // Build message content - with or without PDF
    const userContent: any[] = [{ type: "text", text: userPrompt }];
    
    if (pdfBase64) {
      console.log(`[Extrair Método] Sending PDF inline to AI for direct analysis...`);
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:application/pdf;base64,${pdfBase64}`
        }
      });
    } else {
      console.log(`[Extrair Método] No PDF available, analyzing with metadata only`);
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({
          success: false,
          fallback: true,
          error_code: 'RATE_LIMITED',
          error: 'Limite de requisições da IA atingido. Tente novamente em instantes.',
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({
          success: false,
          fallback: true,
          error_code: 'AI_CREDITS_EXHAUSTED',
          error: 'Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso para retomar a detecção automática.',
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error(`[Extrair Método] AI error ${status}: ${errorText.substring(0, 200)}`);
      return new Response(JSON.stringify({
        success: false,
        fallback: true,
        error_code: 'AI_ERROR',
        error: `Falha temporária da IA (${status}). Tente novamente.`,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log(`[Extrair Método] AI response: ${content.substring(0, 300)}`);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }

    const result = JSON.parse(jsonMatch[0]);
    const metodoEnvio = result.metodo_envio || 'portal';
    const emailDestino = result.email_destino || null;

    console.log(`[Extrair Método] Result: metodo=${metodoEnvio}, email=${emailDestino}, confianca=${result.confianca}`);

    // Step 3: Update the licitacao
    const updateData: Record<string, any> = { metodo_envio: metodoEnvio };
    if (emailDestino && emailDestino !== 'null') {
      updateData.email_destino = emailDestino;
    }

    const { error: updateError } = await supabase
      .from('licitacoes')
      .update(updateData)
      .eq('id', licitacao_id);

    if (updateError) {
      console.error(`[Extrair Método] Update error:`, updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({
      success: true,
      metodo_envio: metodoEnvio,
      email_destino: emailDestino,
      confianca: result.confianca,
      justificativa: result.justificativa,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Extrair Método] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
