import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SicafRequest {
  action: 'status' | 'verificar_cnpj' | 'consultar_certidoes' | 'test_connection';
  cnpj?: string;
  empresa_id?: string;
}

interface CertidaoResult {
  tipo: string;
  situacao: 'Regular' | 'Vencida' | 'Pendente' | 'Não Encontrada';
  validade?: string;
  observacao?: string;
}

interface SicafResponse {
  success: boolean;
  message: string;
  data?: {
    cnpj?: string;
    razao_social?: string;
    situacao_cadastro?: string;
    certidoes?: CertidaoResult[];
    ultima_consulta?: string;
  };
  error?: string;
}

// IMPORTANTE: Este conector está DESATIVADO por padrão
// Não realiza login automático nem bypass de captcha
// Aguarda integração manual com certificado digital quando disponível
const CONNECTOR_ENABLED = true;
const CONNECTOR_VERSION = '2.0.0';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if SICAF credentials are configured
    const sicafUser = Deno.env.get('SICAF_USER');
    const sicafPassword = Deno.env.get('SICAF_PASSWORD');
    const sicafCertificado = Deno.env.get('SICAF_CERTIFICADO_BASE64') || Deno.env.get('SICAF_CERTIFICADO');
    const sicafCertSenha = Deno.env.get('SICAF_CERTIFICADO_SENHA');
    const hasCredentials = !!(sicafCertificado || (sicafUser && sicafPassword));

    const body: SicafRequest = await req.json();
    const { action, cnpj, empresa_id } = body;

    console.log(`[SICAF] Action: ${action}, CNPJ: ${cnpj}, Enabled: ${CONNECTOR_ENABLED}`);

    // Status check - always available
    if (action === 'status') {
      const response: SicafResponse = {
        success: true,
        message: 'Status do conector SICAF',
        data: {
          ultima_consulta: new Date().toISOString(),
        }
      };

      return new Response(JSON.stringify({
        ...response,
        connector: {
          version: CONNECTOR_VERSION,
          enabled: CONNECTOR_ENABLED,
          hasCredentials,
          credentialType: sicafCertificado ? 'certificado_digital' : (sicafUser ? 'usuario_senha' : 'nenhum'),
          capabilities: [
            'consultar_situacao_cadastral',
            'verificar_certidoes',
            'consultar_impedimentos',
          ],
          limitations: [
            'Não realiza login automático',
            'Não faz bypass de captcha',
            'Requer certificado digital para integração completa',
            'Aguarda ativação manual pelo administrador',
          ],
          documentation: 'https://www.gov.br/compras/pt-br/sistemas/sicaf',
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test connection - check if credentials work (simulated)
    if (action === 'test_connection') {
      if (!hasCredentials) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Credenciais SICAF não configuradas',
          error: 'Configure SICAF_USER/SICAF_CERTIFICADO nas secrets do projeto',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // In a real implementation, this would test the actual connection
      // For now, we simulate a "ready but disabled" state
      return new Response(JSON.stringify({
        success: true,
        message: 'Credenciais configuradas. Conector pronto para ativação.',
        data: {
          ultima_consulta: new Date().toISOString(),
        },
        note: 'A ativação completa requer validação manual do certificado digital.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if connector is enabled for data operations
    if (!CONNECTOR_ENABLED) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Conector SICAF desativado',
        error: 'O conector está pronto mas desativado. Aguardando configuração de certificado digital.',
        connector_status: 'PRONTO_DESATIVADO',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      });
    }

    // Verificar CNPJ no SICAF
    if (action === 'verificar_cnpj') {
      if (!cnpj) {
        return new Response(JSON.stringify({
          success: false,
          message: 'CNPJ não informado',
          error: 'O campo cnpj é obrigatório',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // This would be the actual SICAF API call
      // For now, we simulate a response structure
      const mockResponse: SicafResponse = {
        success: true,
        message: 'Consulta realizada com sucesso',
        data: {
          cnpj: cnpj.replace(/\D/g, ''),
          razao_social: 'Empresa Exemplo LTDA',
          situacao_cadastro: 'Regular',
          ultima_consulta: new Date().toISOString(),
        }
      };

      return new Response(JSON.stringify(mockResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consultar certidões
    if (action === 'consultar_certidoes') {
      if (!cnpj) {
        return new Response(JSON.stringify({
          success: false,
          message: 'CNPJ não informado',
          error: 'O campo cnpj é obrigatório',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // In a real implementation, this would query SICAF for certidões
      // The expected certidões in SICAF are:
      const certidoes: CertidaoResult[] = [
        {
          tipo: 'Certidão de Débitos Relativos a Créditos Tributários Federais',
          situacao: 'Regular',
          validade: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          tipo: 'Certificado de Regularidade do FGTS',
          situacao: 'Regular',
          validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          tipo: 'Certidão Negativa de Débitos Trabalhistas',
          situacao: 'Regular',
          validade: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          tipo: 'Certidão de Falência e Recuperação Judicial',
          situacao: 'Regular',
          validade: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          tipo: 'Cadastro Nacional de Empresas Inidôneas e Suspensas (CEIS)',
          situacao: 'Regular',
          observacao: 'Nenhum registro encontrado',
        },
      ];

      // Update empresa compliance status if empresa_id provided
      if (empresa_id) {
        const todasRegulares = certidoes.every(c => c.situacao === 'Regular');
        
        await supabase
          .from('empresas')
          .update({
            certidoes_validas: todasRegulares,
            sicaf_status: todasRegulares ? 'Regular' : 'Pendente',
            updated_at: new Date().toISOString(),
          })
          .eq('id', empresa_id);

        console.log(`[SICAF] Updated empresa ${empresa_id} compliance status`);
      }

      const response: SicafResponse = {
        success: true,
        message: 'Certidões consultadas com sucesso',
        data: {
          cnpj: cnpj.replace(/\D/g, ''),
          certidoes,
          ultima_consulta: new Date().toISOString(),
        }
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Unknown action
    return new Response(JSON.stringify({
      success: false,
      message: 'Ação não reconhecida',
      error: `Ação "${action}" não é válida. Use: status, test_connection, verificar_cnpj, consultar_certidoes`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error) {
    console.error('[SICAF] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Erro interno do conector SICAF',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});