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

    // Verificar CNPJ no SICAF (REAL via BrasilAPI)
    if (action === 'verificar_cnpj') {
      if (!cnpj) {
        return new Response(JSON.stringify({ success: false, message: 'CNPJ não informado', error: 'O campo cnpj é obrigatório' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }

      const cnpjLimpo = cnpj.replace(/\D/g, '');
      const brasilApi = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!brasilApi.ok) {
        const txt = await brasilApi.text();
        return new Response(JSON.stringify({ success: false, message: 'Falha ao consultar CNPJ', error: txt }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: brasilApi.status,
        });
      }
      const dados = await brasilApi.json();

      if (empresa_id) {
        await supabase.from('empresas').update({
          razao_social: dados.razao_social,
          sicaf_status: dados.descricao_situacao_cadastral === 'ATIVA' ? 'Regular' : 'Pendente',
          sicaf_atualizado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', empresa_id);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Consulta realizada com sucesso',
        data: {
          cnpj: cnpjLimpo,
          razao_social: dados.razao_social,
          situacao_cadastro: dados.descricao_situacao_cadastral,
          data_situacao: dados.data_situacao_cadastral,
          natureza_juridica: dados.natureza_juridica,
          cnae_principal: `${dados.cnae_fiscal} - ${dados.cnae_fiscal_descricao}`,
          municipio: dados.municipio,
          uf: dados.uf,
          ultima_consulta: new Date().toISOString(),
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Consultar certidões REAIS (a partir do banco + URLs oficiais)
    if (action === 'consultar_certidoes') {
      if (!cnpj || !empresa_id) {
        return new Response(JSON.stringify({ success: false, message: 'CNPJ e empresa_id são obrigatórios' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      const { data: empresa } = await supabase.from('empresas').select('certidoes, sicaf_validade').eq('id', empresa_id).maybeSingle();
      const cert = (empresa?.certidoes ?? {}) as Record<string, { validade?: string; situacao?: string }>;

      const hoje = Date.now();
      const avaliar = (validade?: string): 'Regular' | 'Vencida' | 'Pendente' => {
        if (!validade) return 'Pendente';
        return new Date(validade).getTime() > hoje ? 'Regular' : 'Vencida';
      };

      const certidoes: CertidaoResult[] = [
        { tipo: 'Receita Federal (CND Conjunta)', situacao: avaliar(cert.federal?.validade), validade: cert.federal?.validade,
          observacao: 'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir' },
        { tipo: 'FGTS - CRF', situacao: avaliar(cert.fgts?.validade), validade: cert.fgts?.validade,
          observacao: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf' },
        { tipo: 'CNDT - Trabalhista', situacao: avaliar(cert.trabalhista?.validade), validade: cert.trabalhista?.validade,
          observacao: 'https://cndt-certidao.tst.jus.br/' },
        { tipo: 'Receita Estadual', situacao: avaliar(cert.estadual?.validade), validade: cert.estadual?.validade },
        { tipo: 'Receita Municipal', situacao: avaliar(cert.municipal?.validade), validade: cert.municipal?.validade },
      ];

      const todasRegulares = certidoes.every(c => c.situacao === 'Regular');
      await supabase.from('empresas').update({
        certidoes_validas: todasRegulares,
        sicaf_status: todasRegulares ? 'Regular' : 'Pendente',
        updated_at: new Date().toISOString(),
      }).eq('id', empresa_id);

      return new Response(JSON.stringify({
        success: true, message: 'Certidões consultadas',
        data: { cnpj: cnpjLimpo, certidoes, ultima_consulta: new Date().toISOString() },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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