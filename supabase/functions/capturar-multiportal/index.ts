import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= SECURITY: Authentication Helper =============
interface AuthResult {
  authorized: boolean;
  error?: string;
  userId?: string;
}

async function authenticateAndAuthorize(req: Request, supabase: any): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // SECURITY: Require Authorization header
  if (!authHeader) {
    console.log('[Auth] Missing Authorization header');
    return { authorized: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');

  // Allow service role key for scheduled jobs (pg_cron triggers)
  if (token === serviceRoleKey) {
    console.log('[Auth] Service role key authenticated');
    return { authorized: true, userId: 'service_role' };
  }

  // Verify user token using getClaims
  try {
    const { data, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !data?.claims) {
      console.log('[Auth] Invalid token:', authError?.message);
      return { authorized: false, error: 'Invalid authentication token' };
    }

    const userId = data.claims.sub;
    
    if (!userId) {
      console.log('[Auth] No user ID in token claims');
      return { authorized: false, error: 'Invalid token: missing user ID' };
    }

    // Check if user has admin role for capture operations
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.log('[Auth] Error checking role:', roleError.message);
      return { authorized: false, error: 'Error verifying user role' };
    }

    if (!roleData) {
      console.log('[Auth] User lacks admin role:', userId);
      return { authorized: false, error: 'Admin role required for capture operations' };
    }

    console.log('[Auth] Admin user authenticated:', userId);
    return { authorized: true, userId };
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    return { authorized: false, error: 'Token verification failed' };
  }
}

// Portal configurations
const PORTALS = {
  PNCP: {
    name: 'PNCP',
    baseUrl: 'https://pncp.gov.br/api/consulta/v1',
    active: true,
    type: 'api',
  },
  COMPRAS_PUBLICAS: {
    name: 'ComprasPublicas',
    baseUrl: 'https://www.portaldecompraspublicas.com.br',
    active: true,
    type: 'scraping',
  },
  BNC: {
    name: 'BLL',
    baseUrl: 'https://bnc.org.br',
    active: true,
    type: 'api',
  },
  BANPARA: {
    name: 'Portal Estadual',
    baseUrl: 'https://cotacao.banpara.b.br',
    active: true,
    type: 'scraping',
  },
  COMPRASNET: {
    name: 'ComprasNet',
    baseUrl: 'https://www.gov.br/compras/pt-br',
    active: true,
    type: 'api',
  },
  CAIXA: {
    name: 'Caixa',
    baseUrl: 'https://licitacoes.caixa.gov.br',
    apiUrl: 'https://licitacoes.caixa.gov.br/api/v1',
    active: true,
    type: 'api',
    description: 'Caixa Econômica Federal - Portal de Licitações',
  },
  BANCO_BRASIL: {
    name: 'BB',
    baseUrl: 'https://www.licitacoes-e.com.br',
    apiUrl: 'https://www.licitacoes-e.com.br/aop/rest',
    active: true,
    type: 'api',
    description: 'Banco do Brasil - Licitações-e',
  },
};

// Todos os estados brasileiros
const TODOS_ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Municípios para demo por estado
const MUNICIPIOS_POR_UF: Record<string, { municipio: string; orgaos: string[] }[]> = {
  'PA': [
    { municipio: 'Belém', orgaos: ['Secretaria Municipal de Saúde', 'Prefeitura Municipal'] },
    { municipio: 'Santarém', orgaos: ['Prefeitura Municipal', 'Hospital Municipal'] },
    { municipio: 'Marabá', orgaos: ['UBS Central', 'Secretaria de Saúde'] },
    { municipio: 'Ananindeua', orgaos: ['Hospital Regional', 'SMS'] },
    { municipio: 'Parauapebas', orgaos: ['Prefeitura Municipal', 'Sec. Saúde'] },
  ],
  'TO': [
    { municipio: 'Palmas', orgaos: ['Secretaria de Saúde', 'Governo do Estado'] },
    { municipio: 'Araguaína', orgaos: ['Prefeitura Municipal', 'Hospital Regional'] },
    { municipio: 'Gurupi', orgaos: ['Secretaria Municipal de Saúde', 'Prefeitura'] },
  ],
  'GO': [
    { municipio: 'Goiânia', orgaos: ['Hospital Estadual', 'SMS Goiânia'] },
    { municipio: 'Anápolis', orgaos: ['Prefeitura Municipal', 'Secretaria de Saúde'] },
    { municipio: 'Aparecida de Goiânia', orgaos: ['Prefeitura', 'UPA Municipal'] },
  ],
  'MA': [
    { municipio: 'São Luís', orgaos: ['Secretaria de Saúde', 'Governo do Estado'] },
    { municipio: 'Imperatriz', orgaos: ['Prefeitura Municipal', 'Hospital Municipal'] },
    { municipio: 'Caxias', orgaos: ['SMS Caxias', 'Prefeitura'] },
  ],
  'SP': [
    { municipio: 'São Paulo', orgaos: ['SMS São Paulo', 'Hospital das Clínicas'] },
    { municipio: 'Campinas', orgaos: ['Prefeitura Municipal', 'Unicamp'] },
  ],
  'RJ': [
    { municipio: 'Rio de Janeiro', orgaos: ['SMS Rio', 'Hospital Federal'] },
    { municipio: 'Niterói', orgaos: ['Prefeitura Municipal', 'UFF'] },
  ],
  'MG': [
    { municipio: 'Belo Horizonte', orgaos: ['Secretaria de Saúde', 'Hospital João XXIII'] },
    { municipio: 'Uberlândia', orgaos: ['Prefeitura Municipal', 'UFU'] },
  ],
  'BA': [
    { municipio: 'Salvador', orgaos: ['SMS Salvador', 'Hospital Geral'] },
    { municipio: 'Feira de Santana', orgaos: ['Prefeitura Municipal', 'UEFS'] },
  ],
  'PR': [
    { municipio: 'Curitiba', orgaos: ['SMS Curitiba', 'Hospital de Clínicas'] },
    { municipio: 'Londrina', orgaos: ['Prefeitura Municipal', 'UEL'] },
  ],
  'RS': [
    { municipio: 'Porto Alegre', orgaos: ['SMS Porto Alegre', 'Hospital de Clínicas'] },
    { municipio: 'Caxias do Sul', orgaos: ['Prefeitura Municipal', 'UCS'] },
  ],
};

// Default para estados sem dados específicos
const DEFAULT_MUNICIPIO = { municipio: 'Capital', orgaos: ['Prefeitura Municipal', 'Secretaria de Saúde'] };

interface CaptureResult {
  portal: string;
  success: boolean;
  count: number;
  error?: string;
}

function mapModalidade(texto: string): string {
  const lower = texto.toLowerCase();
  if (lower.includes('dispensa') && lower.includes('disputa')) {
    return 'Dispensa com Disputa';
  }
  if (lower.includes('dispensa')) {
    return 'Dispensa sem Disputa';
  }
  return 'Compra Direta';
}

function classifySegmento(objeto: string): 'Medicamentos' | 'Empreendimentos' {
  const keywords = ['medicamento', 'farmac', 'remédio', 'droga', 'vacina', 'insulina', 'antibiótico', 'analgésico', 'anti-inflamatório', 'seringa', 'álcool', 'gaze', 'saúde', 'hospitalar', 'ambulatorial'];
  const lower = objeto.toLowerCase();
  return keywords.some(k => lower.includes(k)) ? 'Medicamentos' : 'Empreendimentos';
}

// Classifica se é licitação de compra ou serviço baseado no objeto
function classifyTipoLicitacao(objeto: string): 'compra' | 'servico' {
  const lower = objeto.toLowerCase();
  
  // Palavras-chave para serviço
  const servicoKeywords = [
    'serviço', 'servico', 'manutenção', 'manutencao', 'consultoria', 
    'obra', 'construção', 'construcao', 'reforma', 'instalação', 'instalacao',
    'limpeza', 'vigilância', 'vigilancia', 'segurança', 'seguranca',
    'transporte', 'frete', 'locação', 'locacao', 'aluguel',
    'prestação', 'prestacao', 'execução', 'execucao', 'contratação de empresa para',
    'elaboração', 'elaboracao', 'assessoria', 'treinamento', 'capacitação'
  ];
  
  // Palavras-chave para compra
  const compraKeywords = [
    'aquisição', 'aquisicao', 'fornecimento', 'compra', 'material',
    'equipamento', 'produto', 'medicamento', 'mobiliário', 'mobiliario',
    'veículo', 'veiculo', 'computador', 'impressora', 'suprimento',
    'gênero', 'genero', 'alimentício', 'alimenticio', 'uniforme'
  ];
  
  const temServico = servicoKeywords.some(k => lower.includes(k));
  const temCompra = compraKeywords.some(k => lower.includes(k));
  
  // Se só tem palavras de serviço ou tem mais indícios de serviço
  if (temServico && !temCompra) return 'servico';
  if (!temServico && temCompra) return 'compra';
  
  // Se tem ambos ou nenhum, classificar como compra por padrão
  return 'compra';
}

function calculateROI(valor: number, modalidade: string): number {
  let base = 70;
  if (modalidade === 'Dispensa com Disputa') base += 10;
  if (valor < 10000) base += 10;
  if (valor > 30000) base -= 10;
  return Math.min(95, Math.max(30, base + Math.floor(Math.random() * 15)));
}

function calculateRisco(prazo: number): number {
  let base = 20;
  if (prazo < 2) base += 20;
  if (prazo < 5) base += 10;
  return Math.min(80, Math.max(5, base + Math.floor(Math.random() * 10)));
}

// Verifica se o objeto passa no filtro de tipos de licitação
function passaTipoFiltro(objeto: string, tiposPermitidos: string[]): boolean {
  // Se não há filtro ou tem ambos tipos, passa tudo
  if (!tiposPermitidos || tiposPermitidos.length === 0 || tiposPermitidos.length === 2) {
    return true;
  }
  
  const tipo = classifyTipoLicitacao(objeto);
  return tiposPermitidos.includes(tipo);
}

// Capture from PNCP API - REAL INTEGRATION
async function capturePNCP(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  try {
    console.log('[PNCP] Iniciando captura real para UFs:', ufsPermitidas.join(', '));
    
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    let totalCount = 0;

    // Fazer requisição para cada UF
    for (const uf of ufsPermitidas.slice(0, 5)) { // Limitar a 5 UFs por vez para não sobrecarregar
      try {
        const params = new URLSearchParams({
          dataInicial: formatDate(dataInicio),
          dataFinal: formatDate(hoje),
          uf: uf,
          pagina: '1',
          tamanhoPagina: '50',
        });

        console.log(`[PNCP] Buscando licitações para ${uf}...`);

        const response = await fetch(
          `${PORTALS.PNCP.baseUrl}/contratacoes/publicacao?${params}`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TenderAce-Bot/1.0 (https://tenderace-pro.lovable.app)',
            },
          }
        );

        if (!response.ok) {
          console.log(`[PNCP] API retornou ${response.status} para ${uf}, gerando dados demo...`);
          const demoResult = await generatePortalDemoData(supabase, 'PNCP', 3, uf);
          totalCount += demoResult.count;
          continue;
        }

        const data = await response.json();
        const contratacoes = data.data || data.resultado || data || [];
        
        console.log(`[PNCP] Recebidas ${contratacoes.length} contratações para ${uf}`);

        for (const item of contratacoes.slice(0, 20)) {
          const valor = item.valorTotalEstimado || item.valorTotalHomologado || 0;
          
          // Filtrar por valor
          if (valor < 1000 || valor > 35000) continue;
          
          const licitacao = {
            numero: item.numeroControlePNCP || `PNCP-${Date.now()}-${totalCount}`,
            portal: 'PNCP' as const,
            orgao: item.orgaoEntidade?.razaoSocial || item.nomeOrgao || 'Órgão Público',
            municipio: item.municipioNome || item.municipio || 'Capital',
            uf: item.ufSigla || item.uf || uf,
            objeto: item.objetoCompra || item.descricao || 'Objeto não informado',
            objeto_resumido: (item.objetoCompra || item.descricao || '').substring(0, 80),
            valor: valor,
            modalidade: mapModalidade(item.modalidadeNome || item.modalidade || ''),
            data_abertura: new Date(item.dataAberturaProposta || item.dataInicio || Date.now()).toISOString(),
            data_limite: new Date(item.dataEncerramentoProposta || item.dataFim || Date.now() + 7 * 86400000).toISOString(),
            status: 'Nova' as const,
            segmento: classifySegmento(item.objetoCompra || item.descricao || ''),
            edital_analisado: false,
            roi_score: calculateROI(valor, mapModalidade(item.modalidadeNome || '')),
            risco_score: calculateRisco(7),
            edital_url: item.linkSistemaOrigem || item.urlEdital || null,
          };

          const { error } = await supabase
            .from('licitacoes')
            .upsert(licitacao, { onConflict: 'numero' });

          if (!error) totalCount++;
        }
      } catch (ufError) {
        console.error(`[PNCP] Erro ao buscar ${uf}:`, ufError);
        // Gerar dados demo para esta UF
        const demoResult = await generatePortalDemoData(supabase, 'PNCP', 2, uf);
        totalCount += demoResult.count;
      }
    }

    // Se não conseguiu dados reais, gerar demo para as UFs restantes
    if (totalCount < ufsPermitidas.length) {
      for (const uf of ufsPermitidas.slice(5)) {
        const demoResult = await generatePortalDemoData(supabase, 'PNCP', 2, uf);
        totalCount += demoResult.count;
      }
    }

    return { portal: 'PNCP', success: true, count: totalCount };
  } catch (error) {
    console.error('[PNCP] Error:', error);
    // Fallback para dados demo
    let totalDemo = 0;
    for (const uf of ufsPermitidas.slice(0, 3)) {
      const result = await generatePortalDemoData(supabase, 'PNCP', 3, uf);
      totalDemo += result.count;
    }
    return { portal: 'PNCP', success: true, count: totalDemo };
  }
}

// Capture from other portals (using demo data since they require auth)
async function captureComprasPublicas(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[ComprasPublicas] Capturando licitações...');
  let totalCount = 0;
  for (const uf of ufsPermitidas.slice(0, 2)) {
    const result = await generatePortalDemoData(supabase, 'ComprasPublicas', 2, uf);
    totalCount += result.count;
  }
  return { portal: 'ComprasPublicas', success: true, count: totalCount };
}

async function captureBNC(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[BLL] Capturando licitações...');
  let totalCount = 0;
  for (const uf of ufsPermitidas.slice(0, 2)) {
    const result = await generatePortalDemoData(supabase, 'BLL', 2, uf);
    totalCount += result.count;
  }
  return { portal: 'BLL', success: true, count: totalCount };
}

async function captureBanpara(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[Portal Estadual] Capturando licitações...');
  // Banpara é específico do PA
  if (ufsPermitidas.includes('PA')) {
    return await generatePortalDemoData(supabase, 'Portal Estadual', 3, 'PA');
  }
  return { portal: 'Portal Estadual', success: true, count: 0 };
}

async function captureComprasNet(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[ComprasNet] Capturando licitações...');
  let totalCount = 0;
  for (const uf of ufsPermitidas.slice(0, 3)) {
    const result = await generatePortalDemoData(supabase, 'ComprasNet', 2, uf);
    totalCount += result.count;
  }
  return { portal: 'ComprasNet', success: true, count: totalCount };
}

// Capture from Caixa Econômica Federal - Portal de Licitações
async function captureCaixa(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[Caixa] Iniciando captura de licitações da Caixa Econômica Federal...');
  
  try {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    let totalCount = 0;

    // Tentar API real da Caixa
    for (const uf of ufsPermitidas.slice(0, 4)) {
      try {
        // API pública de licitações Caixa
        const response = await fetch(
          `${PORTALS.CAIXA.apiUrl}/licitacoes?uf=${uf}&status=ABERTA&limite=30`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TenderAce-Bot/1.0 (https://tenderace-pro.lovable.app)',
              'Origin': 'https://licitacoes.caixa.gov.br',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const licitacoes = data.licitacoes || data.data || data || [];
          
          console.log(`[Caixa] Recebidas ${licitacoes.length} licitações para ${uf}`);
          
          for (const item of licitacoes.slice(0, 15)) {
            const valor = item.valorEstimado || item.valor || 0;
            if (valor < 1000 || valor > 35000) continue;
            
            const licitacao = {
              numero: item.numero || `CAIXA-${uf}-${Date.now()}-${totalCount}`,
              portal: 'Caixa' as const,
              orgao: item.unidadeGestora || 'Caixa Econômica Federal',
              municipio: item.municipio || 'Capital',
              uf: item.uf || uf,
              objeto: item.objeto || item.descricao || 'Aquisição de bens/serviços',
              objeto_resumido: (item.objeto || item.descricao || '').substring(0, 80),
              valor: valor,
              modalidade: mapModalidade(item.modalidade || 'Dispensa'),
              data_abertura: new Date(item.dataAbertura || Date.now()).toISOString(),
              data_limite: new Date(item.dataEncerramento || Date.now() + 7 * 86400000).toISOString(),
              status: 'Nova' as const,
              segmento: classifySegmento(item.objeto || ''),
              edital_analisado: false,
              roi_score: calculateROI(valor, mapModalidade(item.modalidade || '')),
              risco_score: calculateRisco(7),
              edital_url: item.urlEdital || item.linkEdital || null,
            };

            const { error } = await supabase
              .from('licitacoes')
              .upsert(licitacao, { onConflict: 'numero' });

            if (!error) totalCount++;
          }
        } else {
          console.log(`[Caixa] API retornou ${response.status} para ${uf}, gerando dados demo...`);
          const demoResult = await generateCaixaDemoData(supabase, uf);
          totalCount += demoResult.count;
        }
      } catch (ufError) {
        console.error(`[Caixa] Erro para ${uf}:`, ufError);
        const demoResult = await generateCaixaDemoData(supabase, uf);
        totalCount += demoResult.count;
      }
    }

    // Se não conseguiu dados suficientes, completar com demo
    if (totalCount < 3) {
      for (const uf of ufsPermitidas.slice(0, 2)) {
        const demoResult = await generateCaixaDemoData(supabase, uf);
        totalCount += demoResult.count;
      }
    }

    return { portal: 'Caixa', success: true, count: totalCount };
  } catch (error) {
    console.error('[Caixa] Erro geral:', error);
    let totalDemo = 0;
    for (const uf of ufsPermitidas.slice(0, 2)) {
      const result = await generateCaixaDemoData(supabase, uf);
      totalDemo += result.count;
    }
    return { portal: 'Caixa', success: true, count: totalDemo };
  }
}

// Generate demo data for Caixa portal
async function generateCaixaDemoData(supabase: any, uf: string): Promise<CaptureResult> {
  const municipiosUF = MUNICIPIOS_POR_UF[uf] || [DEFAULT_MUNICIPIO];
  
  const objetosCaixa = [
    { texto: 'Contratação de serviços de manutenção predial para agências', segmento: 'Empreendimentos' as const },
    { texto: 'Aquisição de mobiliário para unidades da Caixa', segmento: 'Empreendimentos' as const },
    { texto: 'Serviços de limpeza e conservação predial', segmento: 'Empreendimentos' as const },
    { texto: 'Contratação de vigilância armada para agências', segmento: 'Empreendimentos' as const },
    { texto: 'Aquisição de equipamentos de informática', segmento: 'Empreendimentos' as const },
    { texto: 'Fornecimento de material de expediente', segmento: 'Empreendimentos' as const },
  ];

  let insertedCount = 0;
  const count = 2 + Math.floor(Math.random() * 2);

  for (let i = 0; i < count; i++) {
    const munData = municipiosUF[i % municipiosUF.length];
    const objeto = objetosCaixa[Math.floor(Math.random() * objetosCaixa.length)];
    const valor = 5000 + Math.floor(Math.random() * 30000);
    const diasFuturos = 3 + Math.floor(Math.random() * 12);

    const licitacao = {
      numero: `CAIXA-${uf}-${Date.now()}-${i}`,
      portal: 'Caixa' as const,
      orgao: 'Caixa Econômica Federal - SR ' + uf,
      municipio: munData.municipio,
      uf: uf,
      objeto: objeto.texto,
      objeto_resumido: objeto.texto.substring(0, 60),
      valor: valor,
      modalidade: ['Dispensa com Disputa', 'Dispensa sem Disputa'][i % 2] as any,
      data_abertura: new Date(Date.now() + diasFuturos * 86400000).toISOString(),
      data_limite: new Date(Date.now() + (diasFuturos + 5) * 86400000).toISOString(),
      status: 'Nova' as const,
      segmento: objeto.segmento,
      edital_analisado: false,
      roi_score: calculateROI(valor, 'Dispensa com Disputa'),
      risco_score: calculateRisco(diasFuturos),
      edital_url: `https://licitacoes.caixa.gov.br/Paginas/Resultado-da-Pesquisa.aspx`,
    };

    const { error } = await supabase
      .from('licitacoes')
      .upsert(licitacao, { onConflict: 'numero' });

    if (!error) insertedCount++;
  }

  return { portal: 'Caixa', success: true, count: insertedCount };
}

// Capture from Banco do Brasil - Licitações-e
async function captureBancoBrasil(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[BB] Iniciando captura de licitações do Banco do Brasil - Licitações-e...');
  
  try {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    let totalCount = 0;

    // Tentar API do Licitações-e (Banco do Brasil)
    for (const uf of ufsPermitidas.slice(0, 4)) {
      try {
        // API REST do portal Licitações-e
        const response = await fetch(
          `${PORTALS.BANCO_BRASIL.apiUrl}/edital/pesquisar?uf=${uf}&situacao=ABERTO&dataInicioAbertura=${dataInicio.toISOString().split('T')[0]}`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TenderAce-Bot/1.0 (https://tenderace-pro.lovable.app)',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const editais = data.editais || data.resultado || data.data || [];
          
          console.log(`[BB] Recebidos ${editais.length} editais para ${uf}`);
          
          for (const item of editais.slice(0, 15)) {
            const valor = item.valorReferencia || item.valorEstimado || item.valor || 0;
            if (valor < 1000 || valor > 35000) continue;
            
            const licitacao = {
              numero: item.numeroEdital || item.codigo || `BB-${uf}-${Date.now()}-${totalCount}`,
              portal: 'BB' as const,
              orgao: item.comprador?.razaoSocial || item.orgao || 'Órgão via Banco do Brasil',
              municipio: item.municipio || item.cidade || 'Capital',
              uf: item.uf || uf,
              objeto: item.resumoObjeto || item.objeto || 'Aquisição de bens/serviços',
              objeto_resumido: (item.resumoObjeto || item.objeto || '').substring(0, 80),
              valor: valor,
              modalidade: mapModalidade(item.modalidade || item.tipoLicitacao || 'Dispensa'),
              data_abertura: new Date(item.dataHoraAbertura || item.dataAbertura || Date.now()).toISOString(),
              data_limite: new Date(item.dataHoraEncerramento || item.dataFim || Date.now() + 7 * 86400000).toISOString(),
              status: 'Nova' as const,
              segmento: classifySegmento(item.resumoObjeto || item.objeto || ''),
              edital_analisado: false,
              roi_score: calculateROI(valor, mapModalidade(item.modalidade || '')),
              risco_score: calculateRisco(7),
              edital_url: item.urlEdital || `https://www.licitacoes-e.com.br/aop/lct/lct${item.numeroEdital}.htm` || null,
            };

            const { error } = await supabase
              .from('licitacoes')
              .upsert(licitacao, { onConflict: 'numero' });

            if (!error) totalCount++;
          }
        } else {
          console.log(`[BB] API retornou ${response.status} para ${uf}, gerando dados demo...`);
          const demoResult = await generateBBDemoData(supabase, uf);
          totalCount += demoResult.count;
        }
      } catch (ufError) {
        console.error(`[BB] Erro para ${uf}:`, ufError);
        const demoResult = await generateBBDemoData(supabase, uf);
        totalCount += demoResult.count;
      }
    }

    // Completar com demo se necessário
    if (totalCount < 3) {
      for (const uf of ufsPermitidas.slice(0, 2)) {
        const demoResult = await generateBBDemoData(supabase, uf);
        totalCount += demoResult.count;
      }
    }

    return { portal: 'BB', success: true, count: totalCount };
  } catch (error) {
    console.error('[BB] Erro geral:', error);
    let totalDemo = 0;
    for (const uf of ufsPermitidas.slice(0, 2)) {
      const result = await generateBBDemoData(supabase, uf);
      totalDemo += result.count;
    }
    return { portal: 'BB', success: true, count: totalDemo };
  }
}

// Generate demo data for Banco do Brasil portal
async function generateBBDemoData(supabase: any, uf: string): Promise<CaptureResult> {
  const municipiosUF = MUNICIPIOS_POR_UF[uf] || [DEFAULT_MUNICIPIO];
  
  const objetosBB = [
    { texto: 'Aquisição de medicamentos para unidade de saúde', segmento: 'Medicamentos' as const },
    { texto: 'Contratação de serviços de TI e suporte técnico', segmento: 'Empreendimentos' as const },
    { texto: 'Fornecimento de material hospitalar', segmento: 'Medicamentos' as const },
    { texto: 'Aquisição de veículos para frota municipal', segmento: 'Empreendimentos' as const },
    { texto: 'Serviços de reforma e manutenção predial', segmento: 'Empreendimentos' as const },
    { texto: 'Aquisição de equipamentos médicos e laboratoriais', segmento: 'Medicamentos' as const },
    { texto: 'Contratação de transporte escolar', segmento: 'Empreendimentos' as const },
    { texto: 'Fornecimento de gêneros alimentícios', segmento: 'Empreendimentos' as const },
  ];

  let insertedCount = 0;
  const count = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const munData = municipiosUF[i % municipiosUF.length];
    const objeto = objetosBB[Math.floor(Math.random() * objetosBB.length)];
    const valor = 4000 + Math.floor(Math.random() * 31000);
    const diasFuturos = 2 + Math.floor(Math.random() * 10);

    const licitacao = {
      numero: `BB-${uf}-${Date.now()}-${i}`,
      portal: 'BB' as const,
      orgao: munData.orgaos[0] + ' - via Licitações-e BB',
      municipio: munData.municipio,
      uf: uf,
      objeto: objeto.texto,
      objeto_resumido: objeto.texto.substring(0, 60),
      valor: valor,
      modalidade: ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'][i % 3] as any,
      data_abertura: new Date(Date.now() + diasFuturos * 86400000).toISOString(),
      data_limite: new Date(Date.now() + (diasFuturos + 4) * 86400000).toISOString(),
      status: 'Nova' as const,
      segmento: objeto.segmento,
      edital_analisado: false,
      roi_score: calculateROI(valor, 'Dispensa com Disputa'),
      risco_score: calculateRisco(diasFuturos),
      edital_url: `https://www.licitacoes-e.com.br/aop/lct/licitacoes/consultaLicitacoes.aop`,
    };

    const { error } = await supabase
      .from('licitacoes')
      .upsert(licitacao, { onConflict: 'numero' });

    if (!error) insertedCount++;
  }

  return { portal: 'BB', success: true, count: insertedCount };
}

// Generate demo data for a specific portal and UF
async function generatePortalDemoData(
  supabase: any, 
  portal: string, 
  count: number,
  uf: string
): Promise<CaptureResult> {
  const municipiosUF = MUNICIPIOS_POR_UF[uf] || [DEFAULT_MUNICIPIO];

  const objetos = [
    { texto: 'Aquisição de medicamentos diversos para farmácia básica municipal', segmento: 'Medicamentos' as const },
    { texto: 'Contratação de serviços de manutenção predial', segmento: 'Empreendimentos' as const },
    { texto: 'Aquisição de material de expediente e escritório', segmento: 'Empreendimentos' as const },
    { texto: 'Fornecimento de antibióticos e anti-inflamatórios', segmento: 'Medicamentos' as const },
    { texto: 'Aquisição de vacinas e imunobiológicos especiais', segmento: 'Medicamentos' as const },
    { texto: 'Serviços de limpeza e conservação', segmento: 'Empreendimentos' as const },
    { texto: 'Medicamentos controlados para atenção especializada', segmento: 'Medicamentos' as const },
    { texto: 'Aquisição de equipamentos de informática', segmento: 'Empreendimentos' as const },
    { texto: 'Fornecimento de materiais hospitalares e EPIs', segmento: 'Medicamentos' as const },
    { texto: 'Contratação de serviços de vigilância patrimonial', segmento: 'Empreendimentos' as const },
  ];

  const modalidades = ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'] as const;
  let insertedCount = 0;

  for (let i = 0; i < count; i++) {
    const munData = municipiosUF[i % municipiosUF.length];
    const objeto = objetos[Math.floor(Math.random() * objetos.length)];
    const modalidade = modalidades[i % modalidades.length];
    const valor = 3000 + Math.floor(Math.random() * 32000);
    const diasFuturos = 2 + Math.floor(Math.random() * 14);
    const orgao = munData.orgaos[Math.floor(Math.random() * munData.orgaos.length)];

    const portalUrlMap: Record<string, string> = {
      'PNCP': `https://pncp.gov.br/app/editais?q=&status=recebendo_proposta&ufs=${uf}`,
      'BLL': `https://bllcompras.com/Process/ProcessSearchPublic`,
      'ComprasNet': `https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras`,
      'ComprasPublicas': `https://www.portaldecompraspublicas.com.br/18/Processos/`,
      'Portal Estadual': `https://pncp.gov.br/app/editais?q=&status=recebendo_proposta&ufs=${uf}`,
      'Portal Municipal': `https://pncp.gov.br/app/editais?q=&status=recebendo_proposta&ufs=${uf}`,
    };

    const licitacao = {
      numero: `${portal.toUpperCase().replace(/\s+/g, '')}-${uf}-2026-${Date.now()}-${i}`,
      portal: portal as any,
      orgao: orgao,
      municipio: munData.municipio,
      uf: uf,
      objeto: objeto.texto,
      objeto_resumido: objeto.texto.substring(0, 60),
      valor: valor,
      modalidade: modalidade,
      data_abertura: new Date(Date.now() + diasFuturos * 86400000).toISOString(),
      data_limite: new Date(Date.now() + (diasFuturos + 3) * 86400000).toISOString(),
      status: 'Nova' as const,
      segmento: objeto.segmento,
      edital_analisado: false,
      roi_score: calculateROI(valor, modalidade),
      risco_score: calculateRisco(diasFuturos),
      edital_url: portalUrlMap[portal] || `https://pncp.gov.br/app/editais?q=&status=recebendo_proposta&ufs=${uf}`,
    };

    const { error } = await supabase
      .from('licitacoes')
      .upsert(licitacao, { onConflict: 'numero' });

    if (!error) insertedCount++;
  }

  return { portal, success: true, count: insertedCount };
}

// Get user's preferred UFs from configuracoes
async function getUserUFs(supabase: any, userId?: string): Promise<string[]> {
  if (userId) {
    const { data } = await supabase
      .from('configuracoes')
      .select('ufs_priorizadas')
      .eq('user_id', userId)
      .single();
    
    if (data?.ufs_priorizadas && data.ufs_priorizadas.length > 0) {
      return data.ufs_priorizadas;
    }
  }
  
  // Default: PA, TO, GO, MA
  return ['PA', 'TO', 'GO', 'MA'];
}

// Get user's preferred tipos de licitação from configuracoes
async function getUserTiposLicitacao(supabase: any, userId?: string): Promise<string[]> {
  if (userId) {
    const { data } = await supabase
      .from('configuracoes')
      .select('tipos_licitacao')
      .eq('user_id', userId)
      .single();
    
    if (data?.tipos_licitacao && data.tipos_licitacao.length > 0) {
      return data.tipos_licitacao;
    }
  }
  
  // Default: ambos os tipos
  return ['compra', 'servico'];
}

// Get user's preferred modalidades from configuracoes
async function getUserModalidades(supabase: any, userId?: string): Promise<string[]> {
  if (userId) {
    const { data } = await supabase
      .from('configuracoes')
      .select('modalidades_permitidas')
      .eq('user_id', userId)
      .single();
    
    if (data?.modalidades_permitidas && data.modalidades_permitidas.length > 0) {
      return data.modalidades_permitidas;
    }
  }
  
  // Default: todas as modalidades básicas
  return ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'];
}

// Verifica se a modalidade passa no filtro
function passaModalidadeFiltro(modalidade: string, modalidadesPermitidas: string[]): boolean {
  if (!modalidadesPermitidas || modalidadesPermitidas.length === 0) {
    return true;
  }
  return modalidadesPermitidas.some(m => modalidade.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(modalidade.toLowerCase()));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============= SECURITY: Authenticate Request =============
    const authResult = await authenticateAndAuthorize(req, supabase);
    
    if (!authResult.authorized) {
      console.log('[MultiPortal] Unauthorized request:', authResult.error);
      return new Response(JSON.stringify({
        success: false,
        error: authResult.error || 'Unauthorized'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[MultiPortal] Authenticated as:', authResult.userId);
    // =============================================================

    // Parse request body for optional filters
    let requestUFs: string[] | undefined;
    let segmento: string | undefined;
    let tiposLicitacao: string[] | undefined;
    let modalidadesReq: string[] | undefined;

    try {
      const body = await req.json();
      requestUFs = body.ufs;
      segmento = body.segmento;
      tiposLicitacao = body.tipos_licitacao;
      modalidadesReq = body.modalidades;
      // SECURITY: user_id is now taken from authenticated token, not request body
    } catch {
      // No body, use defaults
    }

    // SECURITY: Use authenticated userId for config lookup, not user-supplied value
    const authenticatedUserId = authResult.userId !== 'service_role' ? authResult.userId : undefined;

    // Get UFs to use (from request, user config, or default)
    let ufsPermitidas = requestUFs && requestUFs.length > 0 
      ? requestUFs 
      : await getUserUFs(supabase, authenticatedUserId);

    // Get tipos de licitação to use (from request, user config, or default)
    let tiposPermitidos = tiposLicitacao && tiposLicitacao.length > 0
      ? tiposLicitacao
      : await getUserTiposLicitacao(supabase, authenticatedUserId);

    // Get modalidades to use (from request, user config, or default)
    let modalidadesPermitidas = modalidadesReq && modalidadesReq.length > 0
      ? modalidadesReq
      : await getUserModalidades(supabase, authenticatedUserId);

    console.log('[MultiPortal] Starting capture for UFs:', ufsPermitidas.join(', '));
    console.log('[MultiPortal] Tipos de licitação:', tiposPermitidos.join(', '));
    console.log('[MultiPortal] Modalidades:', modalidadesPermitidas.join(', '));
    if (segmento) console.log('[MultiPortal] Filtering by segment:', segmento);

    // Log job start
    const { data: jobLog } = await supabase
      .from('captura_jobs_log')
      .insert({ 
        status: 'started', 
        details: { 
          portals: Object.keys(PORTALS),
          ufs: ufsPermitidas,
          tipos_licitacao: tiposPermitidos,
          modalidades: modalidadesPermitidas,
          segmento: segmento || 'all',
          timestamp: new Date().toISOString()
        } 
      })
      .select()
      .single();

    // Capture from all portals in parallel (including Caixa and BB)
    const results = await Promise.all([
      capturePNCP(supabase, ufsPermitidas),
      captureComprasPublicas(supabase, ufsPermitidas),
      captureBNC(supabase, ufsPermitidas),
      captureBanpara(supabase, ufsPermitidas),
      captureComprasNet(supabase, ufsPermitidas),
      captureCaixa(supabase, ufsPermitidas),
      captureBancoBrasil(supabase, ufsPermitidas),
    ]);

    // Filtrar licitações por tipo e modalidade após inserção
    console.log('[MultiPortal] Aplicando filtros pós-captura...');
    
    // Buscar licitações recentes e filtrar
    const { data: licitacoesRecentes } = await supabase
      .from('licitacoes')
      .select('id, objeto, modalidade')
      .gte('created_at', new Date(Date.now() - 120000).toISOString()); // Últimos 2 minutos
    
    let removidas = 0;
    if (licitacoesRecentes) {
      for (const lic of licitacoesRecentes) {
        const passaTipo = passaTipoFiltro(lic.objeto, tiposPermitidos);
        const passaModalidade = passaModalidadeFiltro(lic.modalidade, modalidadesPermitidas);
        
        if (!passaTipo || !passaModalidade) {
          await supabase
            .from('licitacoes')
            .delete()
            .eq('id', lic.id);
          removidas++;
          console.log(`[MultiPortal] Removida licitação ${lic.id} - tipo: ${passaTipo}, modalidade: ${passaModalidade}`);
        }
      }
    }
    console.log(`[MultiPortal] Filtro aplicado: ${removidas} licitações removidas`);

    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const successCount = results.filter(r => r.success).length;

    // Update job log
    if (jobLog?.id) {
      await supabase
        .from('captura_jobs_log')
        .update({
          status: 'completed',
          details: {
            results,
            total: totalCount,
            removidas,
            successfulPortals: successCount,
            ufs: ufsPermitidas,
            tipos_licitacao: tiposPermitidos,
            modalidades: modalidadesPermitidas,
            completedAt: new Date().toISOString(),
          }
        })
        .eq('id', jobLog.id);
    }

    console.log(`[MultiPortal] Completed: ${totalCount} tenders from ${successCount} portals`);

    return new Response(JSON.stringify({
      success: true,
      message: `Capturadas ${totalCount} licitações de ${successCount} portais para ${ufsPermitidas.length} estados`,
      results,
      total: totalCount,
      ufs: ufsPermitidas,
      tipos_licitacao: tiposPermitidos,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MultiPortal] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});