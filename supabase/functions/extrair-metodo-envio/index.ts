import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Fetch the licitacao
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

    // Step 1: Fetch documents from PNCP API
    const match = licitacao.numero.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
    let editalText = '';

    if (match && licitacao.portal === 'PNCP') {
      const [, cnpj, _tipo, sequencial, ano] = match;
      const apiUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
      
      console.log(`[Extrair Método] Fetching docs from: ${apiUrl}`);

      const docsResponse = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });

      if (docsResponse.ok) {
        const docs = await docsResponse.json();
        console.log(`[Extrair Método] Found ${Array.isArray(docs) ? docs.length : 0} documents`);

        // Try to download the first edital document (usually PDF)
        if (Array.isArray(docs) && docs.length > 0) {
          // Find the edital/termo de referência
          const editalDoc = docs.find((d: any) => {
            const title = (d.titulo || d.nomeDocumento || '').toLowerCase();
            return title.includes('edital') || title.includes('termo de referência') || title.includes('aviso') || title.includes('dispensa');
          }) || docs[0];

          const docUrl = editalDoc.url || `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos/${editalDoc.sequencialDocumento}`;
          
          console.log(`[Extrair Método] Downloading: ${editalDoc.titulo || 'documento'} from ${docUrl}`);

          try {
            const pdfResponse = await fetch(docUrl);
            if (pdfResponse.ok) {
              const contentType = pdfResponse.headers.get('content-type') || '';
              
              if (contentType.includes('pdf')) {
                // For PDFs, we can't parse natively in Deno easily, 
                // but we can send the URL to AI and ask it to analyze based on the object + document metadata
                editalText = `[Documento PDF disponível em: ${docUrl}]\n`;
                editalText += `Título: ${editalDoc.titulo || editalDoc.nomeDocumento || 'Edital'}\n`;
                editalText += `Data: ${editalDoc.dataPublicacao || 'N/A'}\n`;
                
                // Try to get text content if it's not a PDF
              } else {
                const textContent = await pdfResponse.text();
                // Limit to first 15000 chars to fit in AI context
                editalText = textContent.substring(0, 15000);
              }
            }
          } catch (dlError) {
            console.error(`[Extrair Método] Download error:`, dlError);
          }

          // Also get all document titles for context
          editalText += '\n\nDocumentos disponíveis no edital:\n';
          docs.forEach((d: any) => {
            editalText += `- ${d.titulo || d.nomeDocumento || 'Sem título'}\n`;
          });
        }
      } else {
        console.log(`[Extrair Método] PNCP API returned ${docsResponse.status}`);
      }

      // Also try to get the contratacao details for more context
      const detailUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`;
      try {
        const detailResponse = await fetch(detailUrl, { headers: { 'Accept': 'application/json' } });
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          editalText += `\n\nDetalhes da contratação (API PNCP):\n`;
          editalText += JSON.stringify(detailData, null, 2).substring(0, 5000);
        }
      } catch { /* ignore */ }
    }

    // Step 2: Send to AI for analysis
    console.log(`[Extrair Método] Sending to AI for analysis. Context length: ${editalText.length}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em licitações públicas brasileiras. Sua tarefa é analisar editais e determinar:

1. O MÉTODO DE ENVIO DA PROPOSTA: pode ser "portal" (envio eletrônico via sistema), "email" (envio por e-mail) ou "presencial" (entrega física).
2. Se for email, extrair o E-MAIL DE DESTINO para onde a proposta deve ser enviada.

Dicas para identificar:
- "Dispensa com Disputa" geralmente usa portal eletrônico
- "Dispensa sem Disputa" e "Compra Direta" frequentemente aceitam email
- Procure por frases como "enviar proposta para", "encaminhar para o email", "propostas devem ser enviadas para", "e-mail para cotação"
- Se o edital mencionar sistema eletrônico (ComprasNet, BLL, etc), é "portal"
- Se mencionar "sede do órgão", "protocolo", pode ser "presencial"

Responda APENAS em JSON válido.`
          },
          {
            role: "user",
            content: `Analise esta licitação e determine o método de envio da proposta:

NÚMERO: ${licitacao.numero}
ÓRGÃO: ${licitacao.orgao}
MUNICÍPIO: ${licitacao.municipio}/${licitacao.uf}
MODALIDADE: ${licitacao.modalidade}
PORTAL: ${licitacao.portal}
OBJETO: ${licitacao.objeto}

${editalText ? `\nCONTEÚDO DO EDITAL / DOCUMENTOS:\n${editalText}` : '\nNenhum documento do edital foi encontrado para download.'}

Responda em JSON:
{
  "metodo_envio": "portal" | "email" | "presencial",
  "email_destino": "email@example.com ou null se não for email",
  "confianca": "alta" | "media" | "baixa",
  "justificativa": "breve explicação de como chegou a essa conclusão"
}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Limite de requisições excedido, tente novamente em breve.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Créditos de IA esgotados.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log(`[Extrair Método] AI response: ${content.substring(0, 200)}`);

    // Parse JSON from response
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
