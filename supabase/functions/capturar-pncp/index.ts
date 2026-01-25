import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PNCP API Base URL
const PNCP_API_BASE = "https://pncp.gov.br/api/consulta/v1";

interface PNCPContratacao {
  numeroControlePNCP: string;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    poderId: string;
    esferaId: string;
  };
  anoCompra: number;
  sequencialCompra: number;
  modalidadeId: number;
  modalidadeNome: string;
  modoDisputaId: number;
  modoDisputaNome: string;
  objetoCompra: string;
  valorTotalEstimado: number;
  valorTotalHomologado: number;
  ufNome: string;
  ufSigla: string;
  municipioNome: string;
  dataPublicacaoPncp: string;
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  situacaoCompraId: number;
  situacaoCompraNome: string;
  linkSistemaOrigem: string;
  unidadeOrgao?: {
    ufNome: string;
    ufSigla: string;
    municipioNome: string;
  };
}

function mapModalidade(modalidadeNome: string): string {
  const lower = modalidadeNome.toLowerCase();
  if (lower.includes('dispensa') && lower.includes('disputa')) {
    return 'Dispensa com Disputa';
  }
  if (lower.includes('dispensa')) {
    return 'Dispensa sem Disputa';
  }
  if (lower.includes('compra direta') || lower.includes('cotação')) {
    return 'Compra Direta';
  }
  return 'Dispensa sem Disputa';
}

function classifySegmento(objeto: string): 'Medicamentos' | 'Empreendimentos' {
  const keywords = ['medicamento', 'farmac', 'remédio', 'droga', 'vacina', 'insulina', 'antibiótico', 'analgésico', 'anti-inflamatório'];
  const lower = objeto.toLowerCase();
  return keywords.some(k => lower.includes(k)) ? 'Medicamentos' : 'Empreendimentos';
}

function calculateROI(valor: number, modalidade: string): number {
  let base = 70;
  if (modalidade === 'Dispensa com Disputa') base += 10;
  if (valor < 10000) base += 10;
  if (valor > 30000) base -= 10;
  return Math.min(95, Math.max(30, base + Math.floor(Math.random() * 15)));
}

function calculateRisco(compliance: boolean, prazo: number): number {
  let base = 20;
  if (!compliance) base += 30;
  if (prazo < 2) base += 20;
  return Math.min(80, Math.max(5, base + Math.floor(Math.random() * 10)));
}

// ====== SECURE AUTHENTICATION - NO BYPASSES ======
async function authenticateAndAuthorize(req: Request, supabase: any): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // SECURITY: Require authorization header - NO BYPASS
  if (!authHeader) {
    console.warn('[PNCP Capture] No authorization header provided');
    return { authorized: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Allow service role token (for cron jobs only)
  if (token === serviceRoleKey) {
    console.log('[PNCP Capture] Service role authentication (scheduled job)');
    return { authorized: true, userId: 'service_role' };
  }

  // Verify user token using getClaims
  try {
    const { data, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !data?.claims) {
      console.error('[PNCP Capture] Auth error:', authError?.message || 'No claims');
      // SECURITY: Return unauthorized - NO BYPASS
      return { authorized: false, error: 'Invalid authentication token' };
    }

    const userId = data.claims.sub;
    console.log('[PNCP Capture] User authenticated:', userId);

    // SECURITY: Require admin role - NO BYPASS
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('[PNCP Capture] Role check error:', roleError.message);
      return { authorized: false, error: 'Permission check failed' };
    }

    if (!roleData) {
      console.warn('[PNCP Capture] User lacks admin role:', userId);
      return { authorized: false, error: 'Admin role required' };
    }

    return { authorized: true, userId: userId };
  } catch (error) {
    console.error('[PNCP Capture] Token verification failed:', error);
    // SECURITY: Return unauthorized on exception - NO BYPASS
    return { authorized: false, error: 'Authentication failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Authenticate and authorize the request
    const authResult = await authenticateAndAuthorize(req, supabase);
    
    if (!authResult.authorized) {
      console.warn('[PNCP Capture] Unauthorized access attempt');
      return new Response(JSON.stringify({
        success: false,
        error: authResult.error || 'Unauthorized'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PNCP Capture] Starting capture process (user: ${authResult.userId})...`);

    // Get current date range (last 30 days to capture recent tenders)
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Build query parameters for PNCP API
    // Filter: Dispensa de Licitação (modalidade 8) and value range R$1.000-R$35.000
    const params = new URLSearchParams({
      dataInicial: formatDate(dataInicio),
      dataFinal: formatDate(hoje),
      pagina: '1',
      tamanhoPagina: '100',
    });

    const url = `${PNCP_API_BASE}/contratacoes/publicacao?${params}`;
    console.log(`[PNCP Capture] Fetching from PNCP API...`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LicitaIA-Bot/1.0 (Governo Federal)',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PNCP Capture] API Error: ${response.status}`);
      
      // Return error instead of generating demo data in production
      return new Response(JSON.stringify({
        success: false,
        error: 'PNCP API temporarily unavailable',
        status: response.status
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const contratacoes: PNCPContratacao[] = data.data || data.resultado || data || [];

    console.log(`[PNCP Capture] Received ${contratacoes.length} records from PNCP`);

    // Filter and process
    const filtered = contratacoes.filter((c: PNCPContratacao) => {
      const valor = c.valorTotalEstimado || c.valorTotalHomologado || 0;
      const isDispensa = c.modalidadeNome?.toLowerCase().includes('dispensa') || 
                        c.modalidadeNome?.toLowerCase().includes('compra direta') ||
                        c.modalidadeNome?.toLowerCase().includes('cotação');
      return valor >= 1000 && valor <= 35000 && isDispensa;
    });

    console.log(`[PNCP Capture] After filtering: ${filtered.length} records`);

    let insertedCount = 0;
    let errorCount = 0;

    for (const item of filtered) {
      try {
        const valor = item.valorTotalEstimado || item.valorTotalHomologado || 0;
        const segmento = classifySegmento(item.objetoCompra || '');
        const modalidade = mapModalidade(item.modalidadeNome || '');
        const uf = item.unidadeOrgao?.ufSigla || item.ufSigla || 'DF';
        const municipio = item.unidadeOrgao?.municipioNome || item.municipioNome || 'Brasília';
        
        const dataAbertura = item.dataAberturaProposta ? new Date(item.dataAberturaProposta) : new Date();
        const dataLimite = item.dataEncerramentoProposta ? new Date(item.dataEncerramentoProposta) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const diasAteVencimento = Math.floor((dataLimite.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // Sanitize string inputs
        const sanitizedObjeto = (item.objetoCompra || 'Objeto não informado').substring(0, 2000);
        const sanitizedOrgao = (item.orgaoEntidade?.razaoSocial || 'Órgão Público').substring(0, 500);

        const licitacao = {
          numero: item.numeroControlePNCP || `PNCP-${item.anoCompra}-${item.sequencialCompra}`,
          portal: 'PNCP' as const,
          orgao: sanitizedOrgao,
          uasg: item.orgaoEntidade?.cnpj?.substring(0, 6) || null,
          municipio: municipio.substring(0, 100),
          uf: uf.substring(0, 2),
          objeto: sanitizedObjeto,
          objeto_resumido: sanitizedObjeto.substring(0, 80) + '...',
          valor: valor,
          modalidade: modalidade,
          data_abertura: dataAbertura.toISOString(),
          data_limite: dataLimite.toISOString(),
          status: 'Nova' as const,
          segmento: segmento,
          edital_analisado: false,
          roi_score: calculateROI(valor, modalidade),
          risco_score: calculateRisco(true, diasAteVencimento),
          edital_url: item.linkSistemaOrigem || null,
        };

        const { error } = await supabase
          .from('licitacoes')
          .upsert(licitacao, { onConflict: 'numero' });

        if (error) {
          console.error(`[PNCP Capture] Insert error:`, error);
          errorCount++;
        } else {
          insertedCount++;
        }
      } catch (err) {
        console.error(`[PNCP Capture] Processing error:`, err);
        errorCount++;
      }
    }

    console.log(`[PNCP Capture] Completed: ${insertedCount} inserted, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      message: `Captured ${insertedCount} tenders from PNCP`,
      total: filtered.length,
      inserted: insertedCount,
      errors: errorCount,
      source: 'pncp'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[PNCP Capture] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
