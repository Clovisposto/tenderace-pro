import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface EmailLicitacao {
  // Campos do email
  assunto?: string;
  remetente?: string;
  corpo?: string;
  data_recebimento?: string;
  
  // Campos da licitação (podem vir estruturados ou serem extraídos)
  numero?: string;
  orgao?: string;
  objeto?: string;
  valor?: number | string;
  data_abertura?: string;
  data_limite?: string;
  uf?: string;
  municipio?: string;
  modalidade?: string;
  portal?: string;
  segmento?: 'Medicamentos' | 'Empreendimentos';
  edital_url?: string;
  
  // Anexos/Drive
  anexos?: Array<{
    nome: string;
    url: string;
    tipo: string;
  }>;
  drive_links?: string[];
  
  // Empresa destino
  empresa?: 'medicamentos' | 'empreendimentos' | string;
}

// Classificar segmento baseado em palavras-chave
function classificarSegmento(texto: string): 'Medicamentos' | 'Empreendimentos' {
  const textoLower = texto.toLowerCase();
  
  const keywordsMedicamentos = [
    'medicamento', 'farmac', 'hospitalar', 'saúde', 'saude',
    'médico', 'medico', 'remédio', 'remedio', 'droga',
    'insumo hospitalar', 'material médico', 'equipamento médico',
    'laboratório', 'laboratorio', 'clínica', 'clinica'
  ];
  
  for (const keyword of keywordsMedicamentos) {
    if (textoLower.includes(keyword)) {
      return 'Medicamentos';
    }
  }
  
  return 'Empreendimentos';
}

// Extrair informações do corpo do email usando regex
function extrairInfoEmail(corpo: string, assunto: string): Partial<EmailLicitacao> {
  const textoCompleto = `${assunto} ${corpo}`;
  const info: Partial<EmailLicitacao> = {};
  
  // Extrair número da licitação
  const numeroMatch = textoCompleto.match(/(?:pregão|dispensa|licitação|edital)[\s\-:]*(?:n[°º]?\.?\s*)?(\d+[\/-]?\d*)/i);
  if (numeroMatch) {
    info.numero = numeroMatch[1];
  }
  
  // Extrair valor
  const valorMatch = textoCompleto.match(/R\$\s*([\d.,]+)/);
  if (valorMatch) {
    info.valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
  }
  
  // Extrair UF
  const ufMatch = textoCompleto.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
  if (ufMatch) {
    info.uf = ufMatch[1];
  }
  
  // Extrair datas
  const dataMatch = textoCompleto.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g);
  if (dataMatch && dataMatch.length > 0) {
    // Primeira data pode ser abertura, segunda limite
    const parseData = (d: string) => {
      const [dia, mes, ano] = d.split(/[\/\-]/);
      return new Date(`${ano}-${mes}-${dia}`).toISOString();
    };
    info.data_abertura = parseData(dataMatch[0]);
    if (dataMatch.length > 1) {
      info.data_limite = parseData(dataMatch[1]);
    }
  }
  
  // Extrair órgão
  const orgaoPatterns = [
    /(?:órgão|orgao|entidade|unidade)[\s:]+([^\n,]+)/i,
    /(?:prefeitura|secretaria|ministério|hospital|ubs|ups)[\s\w]+/i
  ];
  for (const pattern of orgaoPatterns) {
    const match = textoCompleto.match(pattern);
    if (match) {
      info.orgao = match[1] || match[0];
      break;
    }
  }
  
  // Classificar segmento
  info.segmento = classificarSegmento(textoCompleto);
  
  return info;
}

// Determinar modalidade
function determinarModalidade(texto: string): 'Dispensa com Disputa' | 'Dispensa sem Disputa' | 'Compra Direta' {
  const textoLower = texto.toLowerCase();
  
  if (textoLower.includes('dispensa') && textoLower.includes('disputa')) {
    return 'Dispensa com Disputa';
  }
  if (textoLower.includes('dispensa')) {
    return 'Dispensa sem Disputa';
  }
  return 'Compra Direta';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar webhook secret (opcional mas recomendado)
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('EMAIL_WEBHOOK_SECRET');
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn('[Webhook] Secret inválido ou ausente');
      // Continuar mesmo sem secret para facilitar integração inicial
    }

    const payload: EmailLicitacao = await req.json();
    console.log('[Webhook] Recebido payload:', JSON.stringify(payload, null, 2));

    // Extrair informações do email se necessário
    let licitacaoInfo = { ...payload };
    
    if (payload.corpo || payload.assunto) {
      const extraido = extrairInfoEmail(
        payload.corpo || '', 
        payload.assunto || ''
      );
      // Mesclar informações extraídas com as fornecidas (fornecidas têm prioridade)
      licitacaoInfo = { ...extraido, ...payload };
    }

    // Determinar segmento pela empresa destino se não especificado
    if (!licitacaoInfo.segmento && payload.empresa) {
      if (payload.empresa.toLowerCase().includes('medicamento')) {
        licitacaoInfo.segmento = 'Medicamentos';
      } else {
        licitacaoInfo.segmento = 'Empreendimentos';
      }
    }

    // Validar campos obrigatórios
    const numero = licitacaoInfo.numero || `EMAIL-${Date.now()}`;
    const orgao = licitacaoInfo.orgao || payload.remetente || 'Órgão não identificado';
    const objeto = licitacaoInfo.objeto || payload.assunto || payload.corpo?.substring(0, 500) || 'Objeto não identificado';
    const valor = typeof licitacaoInfo.valor === 'string' 
      ? parseFloat(licitacaoInfo.valor.replace(/[^\d.,]/g, '').replace(',', '.')) 
      : (licitacaoInfo.valor || 0);
    const uf = licitacaoInfo.uf || 'PA';
    const municipio = licitacaoInfo.municipio || 'Não identificado';
    const segmento = licitacaoInfo.segmento || 'Empreendimentos';
    const modalidade = licitacaoInfo.modalidade 
      ? (licitacaoInfo.modalidade as 'Dispensa com Disputa' | 'Dispensa sem Disputa' | 'Compra Direta')
      : determinarModalidade(objeto);
    
    // Datas
    const agora = new Date();
    const dataAbertura = licitacaoInfo.data_abertura 
      ? new Date(licitacaoInfo.data_abertura)
      : agora;
    const dataLimite = licitacaoInfo.data_limite
      ? new Date(licitacaoInfo.data_limite)
      : new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 dias

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Inserir ou atualizar licitação
    const { data: licitacao, error: licitacaoError } = await supabase
      .from('licitacoes')
      .upsert({
        numero,
        portal: (licitacaoInfo.portal || 'Portal Municipal') as any,
        orgao,
        objeto,
        objeto_resumido: objeto.substring(0, 200),
        valor: isNaN(valor) ? 0 : valor,
        uf,
        municipio,
        segmento,
        modalidade,
        data_abertura: dataAbertura.toISOString(),
        data_limite: dataLimite.toISOString(),
        status: 'Nova',
        edital_url: licitacaoInfo.edital_url || licitacaoInfo.drive_links?.[0] || null,
        roi_score: Math.floor(Math.random() * 30) + 70,
        risco_score: Math.floor(Math.random() * 30) + 10,
      }, {
        onConflict: 'numero',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (licitacaoError) {
      console.error('[Webhook] Erro ao salvar licitação:', licitacaoError);
      throw licitacaoError;
    }

    console.log('[Webhook] Licitação salva com sucesso:', licitacao.id);

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Licitação processada com sucesso',
        licitacao_id: licitacao.id,
        dados: {
          numero,
          orgao,
          valor,
          segmento,
          uf,
          data_limite: dataLimite.toISOString()
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Webhook] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
