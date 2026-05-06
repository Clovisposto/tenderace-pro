import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { action, licitacao_id, empresa_id, motivo, frase, metadata } = body;

    if (!action || !licitacao_id) {
      return new Response(JSON.stringify({ success: false, error: 'action e licitacao_id obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'autorizar') {
      const { error: upErr } = await admin.from('licitacoes').update({ status: 'Autorizada', enviado_para_cotacao: true }).eq('id', licitacao_id);
      if (upErr) throw upErr;

      await admin.from('autorizacao_participacao_log').insert({
        user_id: user.id,
        licitacao_id,
        empresa_id: empresa_id || null,
        acao: 'AUTORIZAR_PARTICIPACAO',
        resultado: 'aprovado',
        frase_recebida: frase || null,
        motivo: motivo || null,
        ip_address: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent') || null,
        metadata: metadata || {},
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'descartar') {
      // Soft cancel: status=Cancelada, registra auditoria
      const { error: upErr } = await admin.from('licitacoes').update({ status: 'Cancelada' }).eq('id', licitacao_id);
      if (upErr) throw upErr;

      await admin.from('autorizacao_participacao_log').insert({
        user_id: user.id,
        licitacao_id,
        empresa_id: empresa_id || null,
        acao: 'DESCARTAR_LICITACAO',
        resultado: 'descartada',
        motivo: motivo || 'Sem interesse',
        ip_address: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent') || null,
        metadata: metadata || {},
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
