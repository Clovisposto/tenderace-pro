// Automação Pós-Vitória — Sala de Disputa
// 1) Busca documentos de habilitação no Google Drive em TODAS as categorias
// 2) Monta a proposta com os itens do edital + cotação (preço de venda, quantidade, modelo)
// 3) Monta o catálogo do produto
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIAS = ['juridica', 'tecnica', 'economica', 'fiscal_trabalhista', 'catalogo'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { proposta_id, licitacao_id, empresa_id } = await req.json();
    if (!licitacao_id || !empresa_id) {
      return new Response(JSON.stringify({ error: 'licitacao_id e empresa_id obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica empresa do usuário
    const { data: empresa } = await supabaseAdmin
      .from('empresas').select('*').eq('id', empresa_id).eq('user_id', user.id).maybeSingle();
    if (!empresa) {
      return new Response(JSON.stringify({ error: 'Empresa não autorizada' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const log: string[] = [];
    const resultado: Record<string, any> = { drive: {}, proposta: null, catalogo: 0, total_docs: 0 };

    // ============ ETAPA 1: BUSCAR DOCS NO DRIVE ============
    log.push('🔍 Conectando ao Google Drive...');
    const driveOk = !!(Deno.env.get('GOOGLE_DRIVE_API_KEY') && Deno.env.get('LOVABLE_API_KEY'));
    if (driveOk) {
      for (const categoria of CATEGORIAS) {
        try {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/buscar-documentos-drive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
              'apikey': SERVICE_KEY,
            },
            body: JSON.stringify({ categoria, licitacao_id, empresa_id, proposta_id, registrar: true }),
          });
          const j = await r.json();
          resultado.drive[categoria] = j.registrados || 0;
          resultado.total_docs += (j.registrados || 0);
          log.push(`📁 ${categoria}: ${j.registrados || 0} doc(s) anexados do Drive`);
        } catch (e: any) {
          log.push(`⚠️ ${categoria}: ${e.message}`);
        }
      }
    } else {
      log.push('⚠️ Google Drive não conectado — pulando busca automática');
    }

    // ============ ETAPA 2: MONTAR PROPOSTA COM ITENS DO EDITAL ============
    log.push('📋 Montando proposta com itens do edital...');

    const { data: licitacao } = await supabaseAdmin
      .from('licitacoes')
      .select('id, numero, orgao, objeto, valor, modalidade')
      .eq('id', licitacao_id).single();

    const { data: analise } = await supabaseAdmin
      .from('analise_editais')
      .select('criterios, exigencias, prazo_entrega, local_entrega, condicoes_pagamento')
      .eq('licitacao_id', licitacao_id).maybeSingle();

    const { data: cotacao } = await supabaseAdmin
      .from('cotacoes')
      .select('preco_final, preco_sugerido, preco_referencia, margem_final, margem_minima, custo_logistica, icms_uf')
      .eq('licitacao_id', licitacao_id).eq('empresa_id', empresa_id)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();

    const { data: produtos } = await supabaseAdmin
      .from('produtos')
      .select('id, descricao, sku, ncm, unidade, preco_venda, custo_medio, estoque_atual')
      .eq('empresa_id', empresa_id).eq('ativo', true);

    // Itens da proposta: criterios do edital × produtos da empresa × cotação
    const criteriosArr: any[] = Array.isArray(analise?.criterios) ? analise!.criterios : [];
    const precoBase = cotacao?.preco_final ?? cotacao?.preco_sugerido ?? cotacao?.preco_referencia ?? licitacao?.valor ?? 0;

    const itensProposta = (criteriosArr.length ? criteriosArr : [{ descricao: licitacao?.objeto, quantidade: 1 }])
      .map((c: any, idx: number) => {
        const desc = c.descricao || c.item || c.nome || `Item ${idx + 1}`;
        const qty = Number(c.quantidade || c.qtd || 1);
        // tenta casar com produto da empresa
        const prod = (produtos || []).find((p: any) =>
          desc.toLowerCase().includes(String(p.descricao).toLowerCase().slice(0, 12))
        );
        const precoUnit = prod?.preco_venda || (precoBase / Math.max(qty, 1));
        return {
          item: idx + 1,
          descricao: desc,
          quantidade: qty,
          unidade: prod?.unidade || c.unidade || 'UN',
          preco_unitario: Number(precoUnit.toFixed(2)),
          preco_total: Number((precoUnit * qty).toFixed(2)),
          ncm: prod?.ncm || null,
          sku: prod?.sku || null,
          modelo: prod?.descricao || desc,
          fonte_cotacao: cotacao ? 'cotacao_empresa' : 'estimado',
          margem_aplicada: cotacao?.margem_final || cotacao?.margem_minima || null,
        };
      });

    const valorTotalProposta = itensProposta.reduce((s, i) => s + i.preco_total, 0);

    // Atualiza/cria proposta com itens
    let propostaIdFinal = proposta_id;
    if (proposta_id) {
      await supabaseAdmin.from('propostas').update({
        documentos: {
          itens: itensProposta,
          analise_edital: {
            prazo_entrega: analise?.prazo_entrega,
            local_entrega: analise?.local_entrega,
            condicoes_pagamento: analise?.condicoes_pagamento,
          },
          montado_em: new Date().toISOString(),
        },
        valor_proposta: valorTotalProposta || undefined,
      }).eq('id', proposta_id);
    } else {
      const { data: nova } = await supabaseAdmin.from('propostas').insert({
        licitacao_id, empresa_id,
        valor_proposta: valorTotalProposta,
        status: 'Rascunho',
        documentos: { itens: itensProposta },
      }).select('id').single();
      propostaIdFinal = nova?.id;
    }

    resultado.proposta = {
      id: propostaIdFinal,
      total_itens: itensProposta.length,
      valor_total: valorTotalProposta,
    };
    log.push(`✅ Proposta montada: ${itensProposta.length} item(ns), total R$ ${valorTotalProposta.toFixed(2)}`);

    // ============ ETAPA 3: MONTAR CATÁLOGO DO PRODUTO ============
    log.push('📚 Montando catálogo do produto...');
    const itensComProduto = itensProposta.filter(i => i.sku);
    for (const item of itensComProduto) {
      // Verifica se já existe catálogo deste item
      const nomeCatalogo = `Catálogo — ${item.modelo} (${item.sku})`;
      const { data: jaExiste } = await supabaseAdmin
        .from('documentos_habilitacao')
        .select('id')
        .eq('licitacao_id', licitacao_id)
        .eq('empresa_id', empresa_id)
        .eq('categoria', 'catalogo')
        .eq('nome', nomeCatalogo).maybeSingle();
      if (jaExiste) continue;

      await supabaseAdmin.from('documentos_habilitacao').insert({
        licitacao_id, empresa_id,
        proposta_id: propostaIdFinal,
        categoria: 'catalogo',
        nome: nomeCatalogo,
        descricao: `Item ${item.item} • Qtd ${item.quantidade} ${item.unidade} • R$ ${item.preco_unitario}`,
        origem: 'manual',
        status: 'pendente',
        metadata: { sku: item.sku, ncm: item.ncm, modelo: item.modelo, preco: item.preco_unitario },
      });
      resultado.catalogo++;
    }
    log.push(`📦 Catálogo: ${resultado.catalogo} ficha(s) de produto criada(s)`);

    // Auditoria
    await supabaseAdmin.from('logs_auditoria').insert({
      user_id: user.id, empresa_id, entidade: 'proposta', entidade_id: propostaIdFinal,
      acao: 'AUTOMACAO_POS_VITORIA',
      dados_novos: { resultado, log },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ ok: true, resultado, log }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('automacao-pos-vitoria:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
