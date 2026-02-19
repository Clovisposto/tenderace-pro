import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= CONFIGURAÇÃO DE CAPTURA REAL PNCP =============
const CONFIG = {
  UFS_PRIORITARIAS: ['PA', 'TO', 'MA', 'GO', 'MT'],
  MODALIDADE_ID: 8,
  VALOR_MIN: 1000,
  VALOR_MAX: 35000,
  STATUS_ABERTO: 'recebendo_proposta',
};

const KEYWORDS_EMPREENDIMENTOS = [
  'computador', 'notebook', 'monitor', 'teclado', 'mouse', 'impressora', 
  'cartucho', 'toner', 'hd', 'ssd', 'memória ram', 'cabo', 'switch', 
  'roteador', 'nobreak', 'estabilizador', 'informática', 'hardware',
  'papel', 'caneta', 'lápis', 'borracha', 'grampeador', 'perfurador',
  'pasta', 'arquivo', 'caderno', 'bloco', 'envelope', 'etiqueta',
  'escritório', 'material de expediente', 'expediente',
  'limpeza', 'detergente', 'desinfetante', 'sabão', 'vassoura', 'rodo',
  'pano', 'luva', 'saco de lixo', 'papel higiênico', 'papel toalha',
  'higiene', 'sanitário', 'lixeira',
  'café', 'açúcar', 'copo descartável', 'água mineral', 'filtro',
  'garrafa térmica', 'copa', 'cozinha', 'refeitório',
  'peças', 'pneu', 'bateria', 'óleo', 'filtro de óleo', 'filtro de ar',
  'veículo', 'automóvel', 'moto', 'motocicleta', 'caminhão', 'van',
  'manutenção veicular', 'mecânica', 'borracharia', 'suspensão', 'freio',
  'cadeira', 'mesa', 'armário', 'estante', 'arquivo', 'móveis',
  'mobiliário', 'ar condicionado', 'bebedouro', 'ventilador',
  'manutenção predial', 'serviço de limpeza', 'vigilância', 'segurança',
  'recarga de extintor', 'dedetização', 'jardinagem',
];

const KEYWORDS_MEDICAMENTOS = [
  'medicamento', 'remédio', 'fármaco', 'farmacêutico', 'droga',
  'comprimido', 'cápsula', 'ampola', 'frasco', 'gotas', 'xarope',
  'pomada', 'creme', 'gel', 'solução', 'suspensão', 'injetável',
  'analgésico', 'antibiótico', 'anti-inflamatório', 'antitérmico',
  'anti-hipertensivo', 'antidiabético', 'insulina', 'dipirona',
  'paracetamol', 'ibuprofeno', 'amoxicilina', 'azitromicina',
  'omeprazol', 'losartana', 'metformina', 'sinvastatina',
  'seringa', 'agulha', 'equipo', 'cateter', 'sonda', 'luva cirúrgica',
  'gaze', 'algodão', 'esparadrapo', 'atadura', 'curativo', 'sutura',
  'bisturi', 'máscara cirúrgica', 'avental',
  'álcool', 'antisséptico', 'desinfetante hospitalar', 'esterilizante',
  'soro fisiológico', 'glicose', 'ringer', 'lactato',
  'estetoscópio', 'esfigmomanômetro', 'termômetro', 'oxímetro',
  'glicosímetro', 'balança', 'maca', 'cadeira de rodas',
  'vacina', 'imunobiológico', 'soro antiofídico', 'imunoglobulina',
  'farmácia básica', 'farmácia hospitalar', 'saúde', 'ubs', 'upa',
  'hospital', 'ambulatorial', 'odontológico', 'oftalmológico',
];

interface PNCPItem {
  numeroControlePNCP?: string;
  orgaoEntidade?: {
    cnpj?: string;
    razaoSocial?: string;
    poderId?: string;
    esferaId?: string;
  };
  unidadeOrgao?: {
    nomeUnidade?: string;
    codigoUnidade?: string;
    ufNome?: string;
    ufSigla?: string;
    municipioNome?: string;
  };
  anoCompra?: number;
  sequencialCompra?: number;
  modalidadeId?: number;
  modalidadeNome?: string;
  modoDisputaId?: number;
  modoDisputaNome?: string;
  objetoCompra?: string;
  valorTotalEstimado?: number;
  valorTotalHomologado?: number;
  ufNome?: string;
  ufSigla?: string;
  municipioNome?: string;
  dataPublicacaoPncp?: string;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
  situacaoCompraId?: number;
  situacaoCompraNome?: string;
  linkSistemaOrigem?: string;
  amparoLegal?: {
    nome?: string;
    descricao?: string;
  };
  tipoContratacaoId?: number;
  tipoContratacaoNome?: string;
}

interface CaptureResult {
  portal: string;
  success: boolean;
  count: number;
  error?: string;
  retries?: number;
}

// ============= RETRY LOGIC WITH EXPONENTIAL BACKOFF =============
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<{ response: Response | null; retries: number; error?: string }> {
  let lastError: string = '';
  let attemptCount = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attemptCount = attempt + 1;
    try {
      if (attempt > 0) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`[Retry] Tentativa ${attemptCount}/${maxRetries + 1}, aguardando ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`[Fetch] Requisição ${attemptCount}: ${url.substring(0, 80)}...`);
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
      
      console.log(`[Fetch] Resposta: HTTP ${response.status}`);
      
      if (response.ok) {
        return { response, retries: attempt };
      }
      
      if (response.status >= 400 && response.status < 500) {
        const body = await response.text();
        console.warn(`[Fetch] Erro cliente ${response.status}: ${body.substring(0, 200)}`);
        return { response: null, retries: attempt, error: `HTTP ${response.status}: ${body.substring(0, 100)}` };
      }
      
      lastError = `HTTP ${response.status}`;
      console.warn(`[Retry] Erro servidor ${response.status}, tentando novamente...`);
      await response.text();
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Erro de rede';
      console.warn(`[Retry] Erro na tentativa ${attemptCount}: ${lastError}`);
      
      if (error instanceof Error && error.name === 'TimeoutError') {
        lastError = 'Timeout após 30s';
      }
    }
  }
  
  console.error(`[Fetch] Falha após ${attemptCount} tentativas: ${lastError}`);
  return { response: null, retries: attemptCount, error: lastError };
}

function mapModalidade(modalidadeNome: string, modoDisputa?: string): string {
  const lower = modalidadeNome.toLowerCase();
  const modoLower = (modoDisputa || '').toLowerCase();
  
  if (lower.includes('dispensa') && modoLower.includes('disputa')) {
    return 'Dispensa com Disputa';
  }
  if (lower.includes('dispensa')) {
    return 'Dispensa sem Disputa';
  }
  if (lower.includes('compra direta') || lower.includes('cotação') || lower.includes('cotacao')) {
    return 'Compra Direta';
  }
  return 'Dispensa sem Disputa';
}

function classifySegmento(objeto: string): 'Medicamentos' | 'Empreendimentos' {
  const lower = objeto.toLowerCase();
  const isMedicamento = KEYWORDS_MEDICAMENTOS.some(k => lower.includes(k.toLowerCase()));
  if (isMedicamento) return 'Medicamentos';
  const isEmpreendimento = KEYWORDS_EMPREENDIMENTOS.some(k => lower.includes(k.toLowerCase()));
  if (isEmpreendimento) return 'Empreendimentos';
  return 'Empreendimentos';
}

function calculateROI(valor: number, modalidade: string, segmento: string): number {
  let base = 70;
  if (modalidade === 'Dispensa com Disputa') base += 10;
  if (modalidade === 'Dispensa sem Disputa') base += 5;
  if (valor >= 5000 && valor <= 20000) base += 15;
  else if (valor < 5000) base += 5;
  else if (valor > 25000) base -= 5;
  if (segmento === 'Medicamentos') base += 8;
  return Math.min(95, Math.max(40, base + Math.floor(Math.random() * 10)));
}

function calculateRisco(diasAteLimite: number, valor: number): number {
  let base = 20;
  if (diasAteLimite < 2) base += 30;
  else if (diasAteLimite < 4) base += 20;
  else if (diasAteLimite < 7) base += 10;
  if (valor > 25000) base += 10;
  return Math.min(80, Math.max(10, base + Math.floor(Math.random() * 10)));
}

// ====== SECURE AUTHENTICATION ======
async function authenticateAndAuthorize(req: Request, supabase: any): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!authHeader) {
    console.warn('[Auth] No authorization header provided');
    return { authorized: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (token === serviceRoleKey) {
    console.log('[Auth] Service role authentication');
    return { authorized: true, userId: 'service_role' };
  }

  try {
    const { data, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !data?.claims) {
      console.error('[Auth] Invalid token:', authError?.message);
      return { authorized: false, error: 'Invalid authentication token' };
    }

    const userId = data.claims.sub;
    console.log('[Auth] User authenticated:', userId);

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.warn('[Auth] User lacks admin role:', userId);
      return { authorized: false, error: 'Admin role required' };
    }

    return { authorized: true, userId };
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return { authorized: false, error: 'Authentication failed' };
  }
}

// ============= CAPTURA REAL DO PNCP =============
async function capturePNCPReal(supabase: any): Promise<CaptureResult> {
  console.log('[PNCP] 🚀 Iniciando captura REAL do Portal Nacional de Contratações Públicas...');
  console.log(`[PNCP] UFs: ${CONFIG.UFS_PRIORITARIAS.join(', ')}`);
  console.log(`[PNCP] Modalidade: ${CONFIG.MODALIDADE_ID} (Dispensa)`);
  console.log(`[PNCP] Valor: R$ ${CONFIG.VALOR_MIN} - R$ ${CONFIG.VALOR_MAX}`);
  
  let totalInserted = 0;
  const errors: string[] = [];

  const hoje = new Date();
  const dataInicial = new Date(hoje);
  dataInicial.setDate(dataInicial.getDate() - 30);
  
  const formatDatePNCP = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  for (const uf of CONFIG.UFS_PRIORITARIAS) {
    try {
      console.log(`[PNCP] 📡 Buscando licitações abertas para ${uf}...`);
      
      const params = new URLSearchParams({
        dataInicial: formatDatePNCP(dataInicial),
        dataFinal: formatDatePNCP(hoje),
        uf: uf,
        codigoModalidadeContratacao: CONFIG.MODALIDADE_ID.toString(),
        pagina: '1',
        tamanhoPagina: '50',
      });

      const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?${params}`;
      console.log(`[PNCP] URL: ${url}`);
      
      const { response, retries, error } = await fetchWithRetry(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response || !response.ok) {
        console.warn(`[PNCP] ⚠️ API indisponível para ${uf} após ${retries} tentativas: ${error}`);
        errors.push(`${uf}: ${error}`);
        continue;
      }

      // FIX: Handle HTTP 204 (no content) and empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        console.log(`[PNCP] Sem resultados para ${uf} (HTTP 204)`);
        continue;
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.log(`[PNCP] Resposta vazia para ${uf}, pulando...`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(`[PNCP] ⚠️ Resposta não-JSON para ${uf}: ${responseText.substring(0, 100)}`);
        errors.push(`${uf}: Resposta não-JSON`);
        continue;
      }

      const contratacoes: PNCPItem[] = data.data || data.resultado || data || [];
      
      console.log(`[PNCP] ✅ Recebidas ${contratacoes.length} contratações de ${uf}`);

      for (const item of contratacoes) {
        try {
          const valor = item.valorTotalEstimado || item.valorTotalHomologado || 0;
          
          if (valor < CONFIG.VALOR_MIN || valor > CONFIG.VALOR_MAX) {
            continue;
          }
          
          const objeto = item.objetoCompra || '';
          const ufItem = item.unidadeOrgao?.ufSigla || item.ufSigla || uf;
          const municipio = item.unidadeOrgao?.municipioNome || item.municipioNome || 'Capital';
          const segmento = classifySegmento(objeto);
          const modalidade = mapModalidade(
            item.modalidadeNome || 'Dispensa',
            item.modoDisputaNome
          );
          
          const dataAbertura = item.dataAberturaProposta 
            ? new Date(item.dataAberturaProposta) 
            : new Date();
          const dataLimite = item.dataEncerramentoProposta 
            ? new Date(item.dataEncerramentoProposta) 
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          
          const diasAteLimite = Math.floor((dataLimite.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          const licitacao = {
            numero: item.numeroControlePNCP || `PNCP-${item.anoCompra}-${item.sequencialCompra}-${uf}`,
            portal: 'PNCP' as const,
            orgao: (item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || 'Órgão Público').substring(0, 500),
            uasg: item.unidadeOrgao?.codigoUnidade || item.orgaoEntidade?.cnpj?.substring(0, 6) || null,
            municipio: municipio.substring(0, 100),
            uf: ufItem.substring(0, 2),
            objeto: objeto.substring(0, 2000) || 'Objeto não informado',
            objeto_resumido: objeto.substring(0, 80) + (objeto.length > 80 ? '...' : ''),
            valor,
            modalidade,
            data_abertura: dataAbertura.toISOString(),
            data_limite: dataLimite.toISOString(),
            status: 'Nova' as const,
            segmento,
            edital_analisado: false,
            roi_score: calculateROI(valor, modalidade, segmento),
            risco_score: calculateRisco(diasAteLimite, valor),
            edital_url: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`,
          };

          const { error: insertError } = await supabase
            .from('licitacoes')
            .upsert(licitacao, { onConflict: 'numero' });

          if (!insertError) {
            totalInserted++;
            console.log(`[PNCP] ✅ Inserida: ${licitacao.numero} - ${segmento} - R$ ${valor.toLocaleString('pt-BR')}`);
          }
        } catch (itemError) {
          console.error(`[PNCP] ❌ Erro ao processar item:`, itemError);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (ufError) {
      console.error(`[PNCP] ❌ Erro ao processar ${uf}:`, ufError);
      errors.push(`${uf}: ${ufError instanceof Error ? ufError.message : 'Unknown error'}`);
    }
  }

  // REMOVED: No more fallback to fake data. Report actual results only.
  console.log(`[PNCP] Captura finalizada: ${totalInserted} licitações reais inseridas`);
  if (errors.length > 0) {
    console.warn(`[PNCP] Erros em ${errors.length} UFs: ${errors.join('; ')}`);
  }

  return {
    portal: 'PNCP',
    success: totalInserted > 0 || errors.length < CONFIG.UFS_PRIORITARIAS.length,
    count: totalInserted,
    error: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
  };
}

// ============= CAPTURA BLL/BNC =============
async function captureBLL(supabase: any): Promise<CaptureResult> {
  console.log('[BLL] 🚀 Iniciando captura do BLL Compras...');
  
  let insertedCount = 0;
  
  try {
    const { response } = await fetchWithRetry('https://bllcompras.com/api/public/directbuy/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        page: 1,
        pageSize: 50,
        status: 'OPEN',
        states: CONFIG.UFS_PRIORITARIAS,
      }),
    }, 2);
    
    if (response?.ok) {
      const data = await response.json();
      const items = data?.items || data?.data || [];
      console.log(`[BLL] ✅ API retornou ${items.length} itens`);
      
      for (const item of items) {
        const valor = item.estimatedValue || item.value || 0;
        if (valor < CONFIG.VALOR_MIN || valor > CONFIG.VALOR_MAX) continue;
        
        const objeto = item.description || item.object || '';
        const segmento = classifySegmento(objeto);
        
        const licitacao = {
          numero: item.id || `BLL-${Date.now()}-${insertedCount}`,
          portal: 'BLL' as const,
          orgao: item.buyerName || 'Órgão Público',
          municipio: item.city || 'Capital',
          uf: item.state || 'PA',
          objeto: objeto.substring(0, 2000),
          objeto_resumido: objeto.substring(0, 80),
          valor,
          modalidade: 'Dispensa com Disputa' as const,
          data_abertura: new Date(item.startDate || Date.now()).toISOString(),
          data_limite: new Date(item.endDate || Date.now() + 7 * 86400000).toISOString(),
          status: 'Nova' as const,
          segmento,
          edital_analisado: false,
          roi_score: calculateROI(valor, 'Dispensa com Disputa', segmento),
          risco_score: 25,
          edital_url: `https://bllcompras.com/DirectBuy/DirectBuySearchPublic`,
        };

        const { error } = await supabase
          .from('licitacoes')
          .upsert(licitacao, { onConflict: 'numero' });

        if (!error) insertedCount++;
      }
    } else {
      console.warn('[BLL] ⚠️ API indisponível, nenhum dado capturado');
    }
  } catch (error) {
    console.warn('[BLL] ⚠️ Erro na captura:', error instanceof Error ? error.message : error);
  }

  // REMOVED: No more fallback fake data
  return { portal: 'BLL', success: insertedCount > 0, count: insertedCount, error: insertedCount === 0 ? 'API indisponível' : undefined };
}

// ============= CAPTURA COMPRASNET =============
async function captureComprasNet(supabase: any): Promise<CaptureResult> {
  console.log('[ComprasNet] 🚀 Iniciando captura do ComprasNet/Gov.br...');
  
  let insertedCount = 0;
  
  try {
    const { response } = await fetchWithRetry(
      'https://compras.dados.gov.br/licitacoes/v1/licitacoes.json?offset=0&limit=50',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      2
    );
    
    if (response?.ok) {
      const data = await response.json();
      const licitacoes = data?._embedded?.licitacoes || [];
      console.log(`[ComprasNet] ✅ API retornou ${licitacoes.length} licitações`);
      
      for (const item of licitacoes) {
        const valor = item.valor_estimado || 0;
        if (valor < CONFIG.VALOR_MIN || valor > CONFIG.VALOR_MAX) continue;
        
        const objeto = item.objeto || '';
        const uf = item.uf_municipio?.uf || 'DF';
        
        if (!CONFIG.UFS_PRIORITARIAS.includes(uf)) continue;
        
        const segmento = classifySegmento(objeto);
        
        const licitacao = {
          numero: item.identificador || `COMPRASNET-${Date.now()}-${insertedCount}`,
          portal: 'ComprasNet' as const,
          orgao: item.orgao || 'Órgão Federal',
          municipio: item.uf_municipio?.nome_municipio || 'Brasília',
          uf,
          objeto: objeto.substring(0, 2000),
          objeto_resumido: objeto.substring(0, 80),
          valor,
          modalidade: 'Dispensa sem Disputa' as const,
          data_abertura: new Date(item.data_abertura || Date.now()).toISOString(),
          data_limite: new Date(item.data_entrega_proposta || Date.now() + 7 * 86400000).toISOString(),
          status: 'Nova' as const,
          segmento,
          edital_analisado: false,
          roi_score: calculateROI(valor, 'Dispensa sem Disputa', segmento),
          risco_score: 30,
          edital_url: `https://www.gov.br/compras/pt-br`,
        };

        const { error } = await supabase
          .from('licitacoes')
          .upsert(licitacao, { onConflict: 'numero' });

        if (!error) insertedCount++;
      }
    } else {
      console.warn('[ComprasNet] ⚠️ API indisponível');
    }
  } catch (error) {
    console.warn('[ComprasNet] ⚠️ Erro na captura:', error instanceof Error ? error.message : error);
  }

  // REMOVED: No more fallback fake data
  return { portal: 'ComprasNet', success: insertedCount > 0, count: insertedCount, error: insertedCount === 0 ? 'API indisponível' : undefined };
}

// ============= CAPTURA COMPRAS PÚBLICAS =============
async function captureComprasPublicas(supabase: any): Promise<CaptureResult> {
  console.log('[ComprasPublicas] 🚀 Iniciando captura do Portal de Compras Públicas...');
  
  let insertedCount = 0;
  
  try {
    const { response } = await fetchWithRetry(
      'https://www.portaldecompraspublicas.com.br/api/v1/processes?status=open&type=dispensa',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      2
    );
    
    if (response?.ok) {
      const data = await response.json();
      const processos = data?.data || data?.processes || [];
      console.log(`[ComprasPublicas] ✅ API retornou ${processos.length} processos`);
      
      for (const item of processos) {
        const valor = item.estimated_value || item.value || 0;
        if (valor < CONFIG.VALOR_MIN || valor > CONFIG.VALOR_MAX) continue;
        
        const objeto = item.object || item.description || '';
        const uf = item.state || 'PA';
        
        if (!CONFIG.UFS_PRIORITARIAS.includes(uf)) continue;
        
        const segmento = classifySegmento(objeto);
        
        const licitacao = {
          numero: item.number || `COMPRASPUB-${Date.now()}-${insertedCount}`,
          portal: 'ComprasPublicas' as const,
          orgao: item.buyer_name || item.entity || 'Órgão Público',
          municipio: item.city || 'Capital',
          uf,
          objeto: objeto.substring(0, 2000),
          objeto_resumido: objeto.substring(0, 80),
          valor,
          modalidade: 'Dispensa com Disputa' as const,
          data_abertura: new Date(item.start_date || Date.now()).toISOString(),
          data_limite: new Date(item.end_date || Date.now() + 7 * 86400000).toISOString(),
          status: 'Nova' as const,
          segmento,
          edital_analisado: false,
          roi_score: calculateROI(valor, 'Dispensa com Disputa', segmento),
          risco_score: 25,
          edital_url: item.url || `https://www.portaldecompraspublicas.com.br/18/`,
        };

        const { error } = await supabase
          .from('licitacoes')
          .upsert(licitacao, { onConflict: 'numero' });

        if (!error) insertedCount++;
      }
    } else {
      console.warn('[ComprasPublicas] ⚠️ API indisponível');
    }
  } catch (error) {
    console.warn('[ComprasPublicas] ⚠️ Erro na captura:', error instanceof Error ? error.message : error);
  }

  // REMOVED: No more fallback fake data
  return { portal: 'ComprasPublicas', success: insertedCount > 0, count: insertedCount, error: insertedCount === 0 ? 'API indisponível' : undefined };
}

// ============= CAPTURA PORTAL ESTADUAL =============
async function capturePortalEstadual(supabase: any): Promise<CaptureResult> {
  console.log('[PortalEstadual] Portais estaduais não possuem API pública disponível.');
  // REMOVED: Was 100% fake data. Now returns count: 0 until real API integration is available.
  return { portal: 'Portal Estadual', success: false, count: 0, error: 'Sem API pública disponível' };
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate
    const authResult = await authenticateAndAuthorize(req, supabase);
    
    if (!authResult.authorized) {
      console.warn('[Capture] ❌ Unauthorized access attempt');
      return new Response(JSON.stringify({
        success: false,
        error: authResult.error || 'Unauthorized'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[Capture] 🤖 INICIANDO CAPTURA 24/7 DE LICITAÇÕES - 5 PORTAIS');
    console.log(`[Capture] 👤 Usuário: ${authResult.userId}`);
    console.log(`[Capture] 📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const results: CaptureResult[] = [];
    let totalInserted = 0;

    // 1. Captura PNCP (Principal)
    console.log('[Capture] 📡 Portal 1/5: PNCP...');
    const pncpResult = await capturePNCPReal(supabase);
    results.push(pncpResult);
    totalInserted += pncpResult.count;

    // 2. Captura BLL
    console.log('[Capture] 📡 Portal 2/5: BLL Compras...');
    const bllResult = await captureBLL(supabase);
    results.push(bllResult);
    totalInserted += bllResult.count;

    // 3. Captura ComprasNet
    console.log('[Capture] 📡 Portal 3/5: ComprasNet...');
    const comprasNetResult = await captureComprasNet(supabase);
    results.push(comprasNetResult);
    totalInserted += comprasNetResult.count;

    // 4. Captura Compras Públicas
    console.log('[Capture] 📡 Portal 4/5: Compras Públicas...');
    const comprasPublicasResult = await captureComprasPublicas(supabase);
    results.push(comprasPublicasResult);
    totalInserted += comprasPublicasResult.count;

    // 5. Captura Portal Estadual
    console.log('[Capture] 📡 Portal 5/5: Portais Estaduais...');
    const estadualResult = await capturePortalEstadual(supabase);
    results.push(estadualResult);
    totalInserted += estadualResult.count;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`[Capture] ✅ CAPTURA CONCLUÍDA: ${totalInserted} licitações REAIS de 5 portais`);
    console.log('═══════════════════════════════════════════════════════════');

    const responseData = {
      success: true,
      message: `Captura concluída: ${totalInserted} licitações reais de 5 portais`,
      total: totalInserted,
      portals: results,
      config: {
        ufs: CONFIG.UFS_PRIORITARIAS,
        modalidade: 'Dispensa (ID 8)',
        valorRange: `R$ ${CONFIG.VALOR_MIN} - R$ ${CONFIG.VALOR_MAX}`,
        portaisAtivos: ['PNCP', 'BLL', 'ComprasNet', 'ComprasPublicas', 'PortalEstadual'],
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Capture] ❌ Fatal error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
