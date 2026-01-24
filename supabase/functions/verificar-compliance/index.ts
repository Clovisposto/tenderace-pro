import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Simula verificação SICAF (na produção, faria chamada real à API SICAF)
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

  // Verificar documentos jurídicos
  DOCUMENTOS_HABILITACAO.juridica.forEach(doc => {
    verificacoes.push({
      documento_id: doc.id,
      documento_nome: doc.nome,
      obrigatorio: doc.obrigatorio,
      status: 'valido',
      observacao: 'Verificado no SICAF',
    });
  });

  // Verificar documentos fiscais - simular algumas pendências realistas
  const diasAleatorios = [30, 60, 90, 120, -5, -10];
  DOCUMENTOS_HABILITACAO.fiscal.forEach((doc, i) => {
    const diasVencimento = diasAleatorios[i % diasAleatorios.length];
    const vencimento = new Date(hoje);
    vencimento.setDate(vencimento.getDate() + diasVencimento);
    
    const vencido = diasVencimento < 0;
    const vencendo = diasVencimento > 0 && diasVencimento <= 15;
    
    verificacoes.push({
      documento_id: doc.id,
      documento_nome: doc.nome,
      obrigatorio: doc.obrigatorio,
      status: vencido ? 'vencido' : 'valido',
      vencimento: vencimento.toISOString(),
      observacao: vencido 
        ? `Vencido há ${Math.abs(diasVencimento)} dias`
        : vencendo
        ? `Vence em ${diasVencimento} dias - ATENÇÃO`
        : 'Válido',
    });
  });

  // Verificar documentos técnicos baseado no segmento
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
      status: status,
      observacao: status === 'valido' ? 'Verificado' : 'Pendente de envio',
    });
  });

  // Verificar documentos econômico-financeiros
  DOCUMENTOS_HABILITACAO.economica.forEach(doc => {
    verificacoes.push({
      documento_id: doc.id,
      documento_nome: doc.nome,
      obrigatorio: doc.obrigatorio,
      status: 'valido',
      observacao: 'Verificado no SICAF',
    });
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { empresa_id, licitacao_id } = await req.json();

    if (!empresa_id || !licitacao_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'empresa_id e licitacao_id são obrigatórios'
      }), {
        status: 400,
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
      error: error instanceof Error ? error.message : 'Erro interno'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});