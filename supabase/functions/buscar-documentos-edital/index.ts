const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { numero, portal } = await req.json();

    if (!numero || !portal) {
      return new Response(
        JSON.stringify({ success: false, error: 'numero and portal are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching documents for ${portal} - ${numero}`);

    let documentos: any[] = [];

    if (portal === 'PNCP') {
      // Parse numero format: CNPJ-tipo-sequencial/ano
      // Example: "12345678000199-1-000001/2025"
      const match = numero.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
      
      if (!match) {
        console.log('Could not parse PNCP numero, trying alternative patterns');
        // Try fetching from PNCP search API
        const searchUrl = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=2024-01-01&dataFinal=2026-12-31&pagina=1&tamanhoPagina=1&q=${encodeURIComponent(numero)}`;
        console.log('Search URL:', searchUrl);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            documentos: [],
            portalUrl: `https://pncp.gov.br/app/editais?q=${encodeURIComponent(numero)}`,
            message: 'Formato de número não reconhecido. Acesse o portal para ver os documentos.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const [, cnpj, _tipo, sequencial, ano] = match;
      const apiUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
      
      console.log('PNCP API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Found ${Array.isArray(data) ? data.length : 0} documents`);
        
        if (Array.isArray(data)) {
          documentos = data.map((doc: any) => ({
            id: doc.sequencialDocumento || doc.id,
            nome: doc.titulo || doc.nomeDocumento || `Documento ${doc.sequencialDocumento}`,
            tipo: doc.tipoDocumentoNome || doc.tipoDocumento || 'PDF',
            url: doc.url || `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos/${doc.sequencialDocumento}`,
            dataPublicacao: doc.dataPublicacao || null,
          }));
        }
      } else {
        console.log(`PNCP API returned ${response.status}`);
        // Try consultation API as fallback
        const consultaUrl = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
        console.log('Trying consultation API:', consultaUrl);
        
        const consultaResponse = await fetch(consultaUrl, {
          headers: { 'Accept': 'application/json' },
        });

        if (consultaResponse.ok) {
          const consultaData = await consultaResponse.json();
          if (Array.isArray(consultaData)) {
            documentos = consultaData.map((doc: any) => ({
              id: doc.sequencialDocumento || doc.id,
              nome: doc.titulo || doc.nomeDocumento || `Documento ${doc.sequencialDocumento}`,
              tipo: doc.tipoDocumentoNome || 'PDF',
              url: doc.url || `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos/${doc.sequencialDocumento}`,
              dataPublicacao: doc.dataPublicacao || null,
            }));
          }
        } else {
          console.log(`Consultation API also returned ${consultaResponse.status}`);
        }
      }
    } else if (portal === 'ComprasNet') {
      // ComprasNet doesn't have a public API for documents
      return new Response(
        JSON.stringify({
          success: true,
          documentos: [],
          portalUrl: `https://www.gov.br/compras/pt-br`,
          message: 'Documentos do ComprasNet devem ser acessados diretamente no portal.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (portal === 'BLL') {
      return new Response(
        JSON.stringify({
          success: true,
          documentos: [],
          portalUrl: `https://bll.org.br`,
          message: 'Documentos da BLL devem ser acessados diretamente no portal.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentos,
        portalUrl: `https://pncp.gov.br/app/editais?q=${encodeURIComponent(numero)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
