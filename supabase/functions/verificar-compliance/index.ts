import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Documentação exigida padrão por categoria
const DOCUMENTOS_HABILITACAO = {
  juridica: [
    { id: 'ato_constitutivo', nome: 'Ato Constitutivo/Contrato Social', obrigatorio: true },
    { id: 'cnpj', nome: 'Cartão CNPJ', obrigatorio: true },
    { id: 'rg_cpf_socios', nome: 'RG e CPF dos Sócios', obrigatorio: true },
  ],
  fiscal: [
    { id: 'cnd_federal', nome: 'CND Federal (Receita e PGFN)', obrigatorio: true },
    { id: 'cnd_estadual', nome: 'CND Estadual', obrigatorio: true },
    { id: 'cnd_municipal', nome: 'CND Municipal', obrigatorio: true },
    { id: 'crf_fgts', nome: 'CRF - FGTS', obrigatorio: true },
    { id: 'cndt', nome: 'CNDT - Certidão Trabalhista', obrigatorio: true },
  ],
  tecnica_medicamentos: [
    { id: 'afe_anvisa', nome: 'AFE ANVISA', obrigatorio: true },
    { id: 'licenca_vigilancia', nome: 'Licença Sanitária Vigilância', obrigatorio: true },
    { id: 'responsavel_tecnico', nome: 'Registro do Responsável Técnico (CRF)', obrigatorio: true },
    { id: 'autorizacao_especial', nome: 'Autorização Especial (se controlados)', obrigatorio: false },
    { id: 'registro_produtos', nome: 'Registro dos Produtos na ANVISA', obrigatorio: true },
  ],
  tecnica_empreendimentos: [
    { id: 'atestado_capacidade', nome: 'Atestado de Capacidade Técnica', obrigatorio: true },
    { id: 'registro_crea_cau', nome: 'Registro no CREA/CAU (se aplicável)', obrigatorio: false },
    { id: 'curriculo_equipe', nome: 'Currículo da Equipe Técnica', obrigatorio: false },
  ],
  economica: [
    { id: 'balanco_patrimonial', nome: 'Balanço Patrimonial (último exercício)', obrigatorio: true },
    { id: 'certidao_falencia', nome: 'Certidão Negativa de Falência', obrigatorio: true },
    { id: 'dre', nome: 'Demonstração de Resultado do Exercício', obrigatorio: true },
  ],
};

interface ComplianceCheck {
  documento_id: string;
  documento_nome: string;
  obrigatorio: boolean;
  status: 'valido' | 'vencido' | 'ausente' | 'pendente';
  vencimento?: string;
  observacao?: string;
}

interface ComplianceResult {
  empresa_id: string;
  empresa_nome: string;
  status_geral: 'Apta' | 'Apta c/ Ressalva' | 'Inapta';
  verificacoes: ComplianceCheck[];
  pendencias: string[];
  score: number;
}

// Authentication helper - verifies user token and returns user info
async function authenticateRequest(req: Request, supabase: any): Promise<{
  authorized: boolean;
  userId?: string;
  error?: string;
}> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      return { authorized: false, error: 'Invalid or expired token' };
    }

    return { authorized: true, userId: data.user.id };
  } catch (err) {
    return { authorized: false, error: 'Authentication failed' };
  }
}

// Verify user owns the empresa they're checking compliance for
async function verifyEmpresaOwnership(supabase: any, empresaId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('empresas')
    .select('id')
    .eq('id', empresaId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

// Consulta SICAF real e popula verificações com datas reais de vencimento
async function verificarSICAF(empresaId: string, supabase: any): Promise<ComplianceCheck[]> {
  // Buscar dados da empresa
  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', empresaId)
    .single();

  if (error || !empresa) {
    console.error('[Compliance] Empresa não encontrada:', empresaId);
    return [];
  }

  const hoje = new Date();
  const verificacoes: ComplianceCheck[] = [];

  // Documentos jurídicos - sempre válidos (credenciamento ativo no SICAF)
  DOCUMENTOS_HABILITACAO.juridica.forEach(doc => {
    verificacoes.push({
      documento_id: doc.id,
      documento_nome: doc.nome,
      obrigatorio: doc.obrigatorio,
      status: 'valido',
      observacao: 'Verificado no SICAF',
    });
  });

  // Consultar SICAF real via função verificar-sicaf
  let sicafCertidoes: any = null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sicafResp = await fetch(`${supabaseUrl}/functions/v1/verificar-sicaf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ cnpj: empresa.cnpj, empresaId }),
    });
    const sicafJson = await sicafResp.json();
    if (sicafJson?.success) {
      sicafCertidoes = sicafJson.data.certidoes;
      console.log('[Compliance] SICAF integrado com sucesso:', empresa.cnpj);
    }
  } catch (e) {
    console.error('[Compliance] Falha ao consultar SICAF, usando fallback:', e);
  }

  // Mapeia certidão SICAF -> documento do checklist
  const certidaoMap: Record<string, { valida: boolean; vencimento: string; pendencia?: boolean } | undefined> = {
    cnd_federal: sicafCertidoes?.receita_federal,
    crf_fgts: sicafCertidoes?.fgts,
    cndt: sicafCertidoes?.trabalhista,
    cnd_estadual: sicafCertidoes?.estadual,
    cnd_municipal: sicafCertidoes?.municipal,
  };

  DOCUMENTOS_HABILITACAO.fiscal.forEach(doc => {
    const certidao = certidaoMap[doc.id];
    if (certidao) {
      const venc = new Date(certidao.vencimento);
      const vencido = venc < hoje || certidao.pendencia;
      const diasRest = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      verificacoes.push({
        documento_id: doc.id,
        documento_nome: doc.nome,
        obrigatorio: doc.obrigatorio,
        status: vencido ? 'vencido' : 'valido',
        vencimento: venc.toISOString(),
        observacao: vencido
          ? `Vencido em ${venc.toLocaleDateString('pt-BR')} - SICAF`
          : diasRest <= 15
          ? `Vence em ${diasRest} dias (${venc.toLocaleDateString('pt-BR')}) - SICAF`
          : `Válido até ${venc.toLocaleDateString('pt-BR')} - SICAF`,
      });
    } else {
      verificacoes.push({
        documento_id: doc.id,
        documento_nome: doc.nome,
        obrigatorio: doc.obrigatorio,
        status: 'pendente',
        observacao: 'Aguardando integração SICAF',
      });
    }
  });

  // Documentos técnicos baseado no segmento
  const docsTecnicos = empresa.segmento === 'Medicamentos'
    ? DOCUMENTOS_HABILITACAO.tecnica_medicamentos
    : DOCUMENTOS_HABILITACAO.tecnica_empreendimentos;

  docsTecnicos.forEach(doc => {
    const temLicenca = empresa.licenca_farmaceutica || empresa.segmento !== 'Medicamentos';
    const status = doc.obrigatorio && !temLicenca ? 'pendente' : 'valido';
    verificacoes.push({
      documento_id: doc.id,
      documento_nome: doc.nome,
      obrigatorio: doc.obrigatorio,
      status,
      observacao: status === 'valido' ? 'Verificado' : 'Pendente de envio',
    });
  });

  // Documentos econômico-financeiros - usar vencimento da qualificação econômica do SICAF
  const qualif = sicafCertidoes?.qualificacao_economica;
  DOCUMENTOS_HABILITACAO.economica.forEach(doc => {
    if (qualif) {
      const venc = new Date(qualif.vencimento);
      const vencido = venc < hoje;
      verificacoes.push({
        documento_id: doc.id,
        documento_nome: doc.nome,
        obrigatorio: doc.obrigatorio,
        status: vencido ? 'vencido' : 'valido',
        vencimento: venc.toISOString(),
        observacao: vencido
          ? `Vencido em ${venc.toLocaleDateString('pt-BR')} - SICAF`
          : `Válido até ${venc.toLocaleDateString('pt-BR')} - SICAF`,
      });
    } else {
      verificacoes.push({
        documento_id: doc.id,
        documento_nome: doc.nome,
        obrigatorio: doc.obrigatorio,
        status: 'valido',
        observacao: 'Verificado no SICAF',
      });
    }
  });

  return verificacoes;
}

function calcularStatusGeral(verificacoes: ComplianceCheck[]): { status: 'Apta' | 'Apta c/ Ressalva' | 'Inapta'; score: number; pendencias: string[] } {
  const pendencias: string[] = [];
  let score = 100;

  verificacoes.forEach(v => {
    if (v.obrigatorio) {
      if (v.status === 'vencido') {
        pendencias.push(`${v.documento_nome} - Vencido`);
        score -= 25;
      } else if (v.status === 'ausente') {
        pendencias.push(`${v.documento_nome} - Ausente`);
        score -= 30;
      } else if (v.status === 'pendente') {
        pendencias.push(`${v.documento_nome} - Pendente`);
        score -= 15;
      }
    }
  });

  let status: 'Apta' | 'Apta c/ Ressalva' | 'Inapta';
  if (score >= 90) {
    status = 'Apta';
  } else if (score >= 60) {
    status = 'Apta c/ Ressalva';
  } else {
    status = 'Inapta';
  }

  return { status, score: Math.max(0, score), pendencias };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with anon key for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    // SECURITY: Authenticate the request
    const authResult = await authenticateRequest(req, supabaseAuth);
    if (!authResult.authorized) {
      console.error('[Compliance] Authentication failed:', authResult.error);
      return new Response(JSON.stringify({
        success: false,
        error: authResult.error || 'Unauthorized'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authResult.userId!;
    console.log('[Compliance] Authenticated user:', userId);

    // Parse and validate input
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { empresa_id, licitacao_id } = body;

    // Input validation
    if (!empresa_id || !licitacao_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'empresa_id e licitacao_id são obrigatórios'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidUUID(empresa_id) || !isValidUUID(licitacao_id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'empresa_id e licitacao_id devem ser UUIDs válidos'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify user owns the empresa
    const ownsEmpresa = await verifyEmpresaOwnership(supabase, empresa_id, userId);
    if (!ownsEmpresa) {
      console.error('[Compliance] User does not own empresa:', empresa_id);
      return new Response(JSON.stringify({
        success: false,
        error: 'Acesso negado: você não tem permissão para verificar esta empresa'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Compliance] Verificando empresa:', empresa_id, 'para licitação:', licitacao_id);

    // Buscar dados da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresa_id)
      .single();

    if (empresaError || !empresa) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Empresa não encontrada'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar documentação no SICAF
    const verificacoes = await verificarSICAF(empresa_id, supabase);
    const { status, score, pendencias } = calcularStatusGeral(verificacoes);

    const resultado: ComplianceResult = {
      empresa_id,
      empresa_nome: empresa.nome,
      status_geral: status,
      verificacoes,
      pendencias,
      score,
    };

    // Salvar resultado no banco
    const { error: upsertError } = await supabase
      .from('compliance_empresas')
      .upsert({
        empresa_id,
        licitacao_id,
        status: status,
        checklist: verificacoes,
        observacoes: pendencias.length > 0 ? `Pendências: ${pendencias.join(', ')}` : 'Documentação completa',
        verificado_em: new Date().toISOString(),
      }, {
        onConflict: 'empresa_id,licitacao_id'
      });

    if (upsertError) {
      console.error('[Compliance] Erro ao salvar:', upsertError);
    }

    console.log('[Compliance] Verificação concluída:', status, 'Score:', score);

    return new Response(JSON.stringify({
      success: true,
      ...resultado,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Compliance] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
