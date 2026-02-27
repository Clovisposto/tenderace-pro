import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function called by the Puppeteer robot agent to:
 * 1. Download the A1 certificate (.pfx/.p12) from private storage
 * 2. Return it as base64 along with the password
 * 3. Used for Gov.br login via client certificate
 * 
 * Security: requires service_role key (only called from VPS agent)
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { empresa_id } = await req.json();

    if (!empresa_id) {
      return new Response(JSON.stringify({ error: 'empresa_id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch empresa cert config
    const { data: empresa, error: empErr } = await supabase
      .from('empresas')
      .select('nome, cnpj, certificado_digital_tipo, certificado_digital_validade, certificado_digital_senha')
      .eq('id', empresa_id)
      .single();

    if (empErr || !empresa) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (empresa.certificado_digital_tipo !== 'A1') {
      return new Response(JSON.stringify({ 
        error: 'Certificado A1 não configurado',
        tipo_atual: empresa.certificado_digital_tipo,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (empresa.certificado_digital_validade) {
      const expiry = new Date(empresa.certificado_digital_validade);
      if (expiry < new Date()) {
        return new Response(JSON.stringify({ 
          error: 'Certificado digital expirado',
          validade: empresa.certificado_digital_validade,
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!empresa.certificado_digital_senha) {
      return new Response(JSON.stringify({ 
        error: 'Senha do certificado não cadastrada. Atualize nas configurações da empresa.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the certificate file in storage
    // Upload path is: {user_id}/{empresa_id}/*.pfx or *.p12
    // We need the user_id (owner) from the empresas table
    const { data: empOwner, error: ownerErr } = await supabase
      .from('empresas')
      .select('user_id')
      .eq('id', empresa_id)
      .single();

    if (ownerErr || !empOwner) {
      return new Response(JSON.stringify({ error: 'Não foi possível determinar o dono da empresa' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storagePath = `${empOwner.user_id}/${empresa_id}`;
    console.log(`[Cert] Buscando certificado em: ${storagePath}`);

    const { data: files, error: listErr } = await supabase.storage
      .from('certificados-digitais')
      .list(storagePath, { limit: 10 });

    if (listErr || !files || files.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Arquivo do certificado não encontrado no cofre digital',
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find .pfx or .p12 file
    const certFile = files.find(f => 
      f.name.toLowerCase().endsWith('.pfx') || f.name.toLowerCase().endsWith('.p12')
    );

    if (!certFile) {
      return new Response(JSON.stringify({ 
        error: 'Nenhum arquivo .pfx ou .p12 encontrado no cofre',
        arquivos_encontrados: files.map(f => f.name),
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const certPath = `${storagePath}/${certFile.name}`;
    console.log(`[Cert] Baixando certificado: ${certPath}`);

    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('certificados-digitais')
      .download(certPath);

    if (downloadErr || !fileData) {
      return new Response(JSON.stringify({ error: 'Erro ao baixar certificado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const certBytes = new Uint8Array(await fileData.arrayBuffer());
    const certBase64 = btoa(String.fromCharCode(...certBytes));

    console.log(`[Cert] ✅ Certificado carregado: ${certFile.name} (${certBytes.length} bytes) para ${empresa.nome}`);

    return new Response(JSON.stringify({
      success: true,
      empresa_nome: empresa.nome,
      empresa_cnpj: empresa.cnpj,
      certificado: {
        filename: certFile.name,
        base64: certBase64,
        size_bytes: certBytes.length,
        senha: empresa.certificado_digital_senha,
        tipo: 'A1',
        validade: empresa.certificado_digital_validade,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[baixar-certificado] Erro:', error);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar certificado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
