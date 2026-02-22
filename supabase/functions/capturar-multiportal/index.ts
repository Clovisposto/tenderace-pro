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

async function authenticateAndAuthorize(req: Request, _supabase: any): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  if (!authHeader) {
    console.log('[Auth] Missing Authorization header');
    return { authorized: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');

  if (token === serviceRoleKey) {
    console.log('[Auth] Service role key authenticated');
    return { authorized: true, userId: 'service_role' };
  }

  try {
    // Use a client with the user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data, error: authError } = await userClient.auth.getClaims(token);
    
    if (authError || !data?.claims) {
      console.log('[Auth] Invalid token:', authError?.message);
      return { authorized: false, error: 'Invalid authentication token' };
    }

    const userId = data.claims.sub;
    
    if (!userId) {
      console.log('[Auth] No user ID in token claims');
      return { authorized: false, error: 'Invalid token: missing user ID' };
    }

    // Use service role client to bypass RLS on user_roles table
    const adminClient = createClient(supabaseUrl, serviceRoleKey!);
    const { data: roleData, error: roleError } = await adminClient
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
  },
  BANCO_BRASIL: {
    name: 'BB',
    baseUrl: 'https://www.licitacoes-e.com.br',
    apiUrl: 'https://www.licitacoes-e.com.br/aop/rest',
    active: true,
    type: 'api',
  },
};

interface CaptureResult {
  portal: string;
  success: boolean;
  count: number;
  error?: string;
}

// Convert BRT (UTC-3) date string from PNCP to proper UTC ISO string
// PNCP returns dates in Brasília time without timezone info (e.g., "2026-02-20T08:40:00")
function brtToUtc(dateStr: string | null | undefined, fallback: string): string {
  if (!dateStr) return fallback;
  // If already has timezone info (+00:00, Z, etc.), use as-is
  if (dateStr.includes('+') || dateStr.endsWith('Z')) {
    return new Date(dateStr).toISOString();
  }
  // Treat as BRT (UTC-3): add 3 hours to get UTC
  const d = new Date(dateStr + 'Z'); // parse as UTC first
  d.setHours(d.getHours() + 3); // shift +3 hours (BRT -> UTC)
  return d.toISOString();
}

// Parse PNCP number to extract CNPJ, year, and sequence for detail API lookup
// Format: "CNPJ-sequencial-numero/ano" e.g. "10735145000194-1-000019/2026"
function parsePncpNumero(numero: string): { cnpj: string; ano: string; seq: string } | null {
  if (!numero) return null;
  const match = numero.match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (!match) return null;
  return { cnpj: match[1], ano: match[3], seq: String(parseInt(match[2], 10)) };
}

// Check real status of a tender via PNCP detail API
// Returns true if the tender is still open/active, false if finalized
async function isPncpTenderActive(numero: string): Promise<boolean> {
  const parsed = parsePncpNumero(numero);
  if (!parsed) return true; // If can't parse, allow it through

  try {
    const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/${parsed.cnpj}/${parsed.ano}/${parsed.seq}`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TenderAce-Bot/1.0',
      },
    });

    if (!resp.ok) {
      console.log(`[PNCP-Detail] HTTP ${resp.status} para ${numero}`);
      return true; // If API fails, don't block
    }

    const detail = await resp.json();
    const situacaoId = detail.situacaoCompraId;
    const situacaoNome = (detail.situacaoCompraNome || '').toLowerCase();

    console.log(`[PNCP-Detail] ${numero} → situação: ${situacaoId} (${situacaoNome})`);

    // situacaoCompraId: 1=Divulgada, 2=Aberta, 3=Suspensa, 4=Homologada, 5=Revogada, 6=Anulada, 7=Deserta, 8=Fracassada
    const statusFinalizados = [4, 5, 6, 7, 8];
    if (statusFinalizados.includes(situacaoId)) return false;
    if (situacaoNome.includes('homologad') || situacaoNome.includes('encerrad') || situacaoNome.includes('revogad') || situacaoNome.includes('anulad') || situacaoNome.includes('deserta') || situacaoNome.includes('fracassad')) return false;

    return true;
  } catch (err) {
    console.warn(`[PNCP-Detail] Erro ao verificar ${numero}:`, err);
    return true; // On error, don't block
  }
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

function classifyTipoLicitacao(objeto: string): 'compra' | 'servico' {
  const lower = objeto.toLowerCase();
  const servicoKeywords = [
    'serviço', 'servico', 'manutenção', 'manutencao', 'consultoria', 
    'obra', 'construção', 'construcao', 'reforma', 'instalação', 'instalacao',
    'limpeza', 'vigilância', 'vigilancia', 'segurança', 'seguranca',
    'transporte', 'frete', 'locação', 'locacao', 'aluguel',
    'prestação', 'prestacao', 'execução', 'execucao', 'contratação de empresa para',
    'elaboração', 'elaboracao', 'assessoria', 'treinamento', 'capacitação'
  ];
  const compraKeywords = [
    'aquisição', 'aquisicao', 'fornecimento', 'compra', 'material',
    'equipamento', 'produto', 'medicamento', 'mobiliário', 'mobiliario',
    'veículo', 'veiculo', 'computador', 'impressora', 'suprimento',
    'gênero', 'genero', 'alimentício', 'alimenticio', 'uniforme'
  ];
  const temServico = servicoKeywords.some(k => lower.includes(k));
  const temCompra = compraKeywords.some(k => lower.includes(k));
  if (temServico && !temCompra) return 'servico';
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

function passaTipoFiltro(objeto: string, tiposPermitidos: string[]): boolean {
  if (!tiposPermitidos || tiposPermitidos.length === 0 || tiposPermitidos.length === 2) {
    return true;
  }
  const tipo = classifyTipoLicitacao(objeto);
  return tiposPermitidos.includes(tipo);
}

// Capture from PNCP API - REAL INTEGRATION (no demo fallback)
async function capturePNCP(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  try {
    console.log('[PNCP] Iniciando captura real para UFs:', ufsPermitidas.join(', '));
    
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    // PNCP API requires YYYYMMDD format (no hyphens)
    const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
    
    let totalCount = 0;
    const errors: string[] = [];

    for (const uf of ufsPermitidas.slice(0, 5)) {
      try {
        const params = new URLSearchParams({
          dataInicial: formatDate(dataInicio),
          dataFinal: formatDate(hoje),
          codigoModalidadeContratacao: '8',
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
          console.log(`[PNCP] API retornou ${response.status} para ${uf}`);
          errors.push(`${uf}: HTTP ${response.status}`);
          continue;
        }

        // Handle HTTP 204 and empty responses
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          console.log(`[PNCP] Sem resultados para ${uf} (HTTP 204)`);
          continue;
        }

        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          console.log(`[PNCP] Resposta vazia para ${uf}`);
          continue;
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.warn(`[PNCP] Resposta não-JSON para ${uf}`);
          errors.push(`${uf}: resposta não-JSON`);
          continue;
        }

        const contratacoes = data.data || data.resultado || data || [];
        console.log(`[PNCP] Recebidas ${contratacoes.length} contratações para ${uf}`);

        for (const item of contratacoes.slice(0, 50)) {
          const valor = item.valorTotalEstimado || item.valorTotalHomologado || 0;
          if (valor < 500 || valor > 500000) continue;

          // Skip finalized/homologated tenders
          const situacao = (item.situacaoCompraId || item.situacaoCompraNome || item.situacao || '').toString().toLowerCase();
          if (situacao.includes('homologad') || situacao.includes('finaliz') || situacao.includes('revogad') || situacao.includes('anulad') || situacao.includes('cancelad') || situacao.includes('encerrad') || situacao === '4' || situacao === '5') {
            console.log(`[PNCP] Ignorando licitação finalizada: ${item.numeroControlePNCP} (situação: ${situacao})`);
            continue;
          }

          // Use real dates from API; skip if no valid deadline date
          const dataAberturaRaw = item.dataAberturaProposta || item.dataInicioProposta || item.dataPublicacaoPncp || item.dataInicio;
          const dataLimiteRaw = item.dataEncerramentoProposta || item.dataFimProposta || item.dataFim;

          // If no deadline date from API, skip this tender (don't fabricate dates)
          if (!dataLimiteRaw) {
            console.log(`[PNCP] Ignorando licitação sem data limite: ${item.numeroControlePNCP}`);
            continue;
          }

          const dataLimite = brtToUtc(dataLimiteRaw, '');
          const dataAbertura = brtToUtc(dataAberturaRaw, new Date().toISOString());

          // Skip tenders whose deadline has already passed
          if (new Date(dataLimite) < new Date()) {
            console.log(`[PNCP] Ignorando licitação expirada: ${item.numeroControlePNCP} (limite: ${dataLimite})`);
            continue;
          }

          const numeroPNCP = item.numeroControlePNCP || '';

          // Double-check: query PNCP detail API to confirm tender is truly active
          if (numeroPNCP) {
            const isActive = await isPncpTenderActive(numeroPNCP);
            if (!isActive) {
              console.log(`[PNCP] Verificação detalhada: ${numeroPNCP} está finalizada — ignorando`);
              continue;
            }
          }
          
          const licitacao = {
            numero: numeroPNCP || `PNCP-${Date.now()}-${totalCount}`,
            portal: 'PNCP' as const,
            orgao: item.orgaoEntidade?.razaoSocial || item.nomeOrgao || 'Órgão Público',
            municipio: item.municipioNome || item.municipio || 'Capital',
            uf: item.ufSigla || item.uf || uf,
            objeto: item.objetoCompra || item.descricao || 'Objeto não informado',
            objeto_resumido: (item.objetoCompra || item.descricao || '').substring(0, 80),
            valor: valor,
            modalidade: mapModalidade(item.modalidadeNome || item.modalidade || ''),
            data_abertura: dataAbertura,
            data_limite: dataLimite,
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
        errors.push(`${uf}: ${ufError instanceof Error ? ufError.message : 'erro'}`);
      }
    }

    // REMOVED: No demo data fallback
    return { portal: 'PNCP', success: totalCount > 0, count: totalCount, error: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined };
  } catch (error) {
    console.error('[PNCP] Error:', error);
    return { portal: 'PNCP', success: false, count: 0, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// REMOVED: All demo data fallback functions. Each portal now returns count: 0 when API is unavailable.

async function captureComprasPublicas(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[ComprasPublicas] API não disponível publicamente.');
  return { portal: 'ComprasPublicas', success: false, count: 0, error: 'API não disponível' };
}

async function captureBNC(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[BLL] API não disponível publicamente.');
  return { portal: 'BLL', success: false, count: 0, error: 'API não disponível' };
}

async function captureBanpara(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[Portal Estadual] API não disponível publicamente.');
  return { portal: 'Portal Estadual', success: false, count: 0, error: 'API não disponível' };
}

async function captureComprasNet(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[ComprasNet] API não disponível publicamente.');
  return { portal: 'ComprasNet', success: false, count: 0, error: 'API não disponível' };
}

// Capture from Caixa - REAL API only, no demo fallback
async function captureCaixa(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[Caixa] Iniciando captura de licitações da Caixa Econômica Federal...');
  
  try {
    let totalCount = 0;

    for (const uf of ufsPermitidas.slice(0, 4)) {
      try {
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
          // Handle empty responses
          if (response.status === 204 || response.headers.get('content-length') === '0') {
            console.log(`[Caixa] Sem resultados para ${uf}`);
            continue;
          }

          const responseText = await response.text();
          if (!responseText || responseText.trim() === '') continue;

          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            console.warn(`[Caixa] Resposta não-JSON para ${uf}`);
            continue;
          }

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
          console.log(`[Caixa] API retornou ${response.status} para ${uf}`);
        }
      } catch (ufError) {
        console.error(`[Caixa] Erro para ${uf}:`, ufError);
      }
    }

    // REMOVED: No demo data fallback
    return { portal: 'Caixa', success: totalCount > 0, count: totalCount, error: totalCount === 0 ? 'API indisponível' : undefined };
  } catch (error) {
    console.error('[Caixa] Erro geral:', error);
    return { portal: 'Caixa', success: false, count: 0, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Capture from Banco do Brasil - REAL API only, no demo fallback
async function captureBancoBrasil(supabase: any, ufsPermitidas: string[]): Promise<CaptureResult> {
  console.log('[BB] Iniciando captura de licitações do Banco do Brasil...');
  
  try {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    let totalCount = 0;

    for (const uf of ufsPermitidas.slice(0, 4)) {
      try {
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
          // Handle empty responses
          if (response.status === 204 || response.headers.get('content-length') === '0') {
            console.log(`[BB] Sem resultados para ${uf}`);
            continue;
          }

          const responseText = await response.text();
          if (!responseText || responseText.trim() === '') continue;

          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            console.warn(`[BB] Resposta não-JSON para ${uf}`);
            continue;
          }

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
              edital_url: item.urlEdital || null,
            };

            const { error } = await supabase
              .from('licitacoes')
              .upsert(licitacao, { onConflict: 'numero' });

            if (!error) totalCount++;
          }
        } else {
          console.log(`[BB] API retornou ${response.status} para ${uf}`);
        }
      } catch (ufError) {
        console.error(`[BB] Erro para ${uf}:`, ufError);
      }
    }

    // REMOVED: No demo data fallback
    return { portal: 'BB', success: totalCount > 0, count: totalCount, error: totalCount === 0 ? 'API indisponível' : undefined };
  } catch (error) {
    console.error('[BB] Erro geral:', error);
    return { portal: 'BB', success: false, count: 0, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
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
  return ['PA', 'TO', 'GO', 'MA'];
}

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
  return ['compra', 'servico'];
}

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
  return ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'];
}

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
    } catch {
      // No body, use defaults
    }

    const authenticatedUserId = authResult.userId !== 'service_role' ? authResult.userId : undefined;

    let ufsPermitidas = requestUFs && requestUFs.length > 0 
      ? requestUFs 
      : await getUserUFs(supabase, authenticatedUserId);

    let tiposPermitidos = tiposLicitacao && tiposLicitacao.length > 0
      ? tiposLicitacao
      : await getUserTiposLicitacao(supabase, authenticatedUserId);

    let modalidadesPermitidas = modalidadesReq && modalidadesReq.length > 0
      ? modalidadesReq
      : await getUserModalidades(supabase, authenticatedUserId);

    console.log('[MultiPortal] Starting capture for UFs:', ufsPermitidas.join(', '));
    console.log('[MultiPortal] Tipos de licitação:', tiposPermitidos.join(', '));
    console.log('[MultiPortal] Modalidades:', modalidadesPermitidas.join(', '));
    if (segmento) console.log('[MultiPortal] Filtering by segment:', segmento);

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

    // Capture from all portals in parallel (real APIs only, no demo data)
    const results = await Promise.all([
      capturePNCP(supabase, ufsPermitidas),
      captureComprasPublicas(supabase, ufsPermitidas),
      captureBNC(supabase, ufsPermitidas),
      captureBanpara(supabase, ufsPermitidas),
      captureComprasNet(supabase, ufsPermitidas),
      captureCaixa(supabase, ufsPermitidas),
      captureBancoBrasil(supabase, ufsPermitidas),
    ]);

    // Filter recently captured tenders by tipo and modalidade
    console.log('[MultiPortal] Aplicando filtros pós-captura...');
    
    const { data: licitacoesRecentes } = await supabase
      .from('licitacoes')
      .select('id, objeto, modalidade')
      .gte('created_at', new Date(Date.now() - 120000).toISOString());
    
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
        }
      }
    }
    console.log(`[MultiPortal] Filtro aplicado: ${removidas} licitações removidas`);

    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const successCount = results.filter(r => r.success).length;

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

    console.log(`[MultiPortal] Completed: ${totalCount} real tenders from ${successCount} portals`);

    return new Response(JSON.stringify({
      success: true,
      message: `Capturadas ${totalCount} licitações reais de ${successCount} portais para ${ufsPermitidas.length} estados`,
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
