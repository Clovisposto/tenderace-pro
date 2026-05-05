import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Support action from POST body as well (frontend sends via invoke body)
    let parsedBody: Record<string, unknown> | null = null;
    if (req.method === "POST" && !action) {
      try {
        parsedBody = await req.json();
        if (parsedBody?.action) action = parsedBody.action as string;
      } catch { /* not JSON */ }
    }

    console.log(`[robo-controle] ▶ ${req.method} action=${action} ts=${new Date().toISOString()}`);

    // ─── GET: Agent polls for active robot configs ───
    if (req.method === "GET" && action === "poll") {
      const { data, error } = await supabase
        .from("robo_configuracao")
        .select(`
          *,
          empresas:empresa_id (nome, cnpj, certificado_digital_tipo, certificado_digital_senha, email, telefone, endereco, razao_social, papel_timbrado_url, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_password, email_smtp_ssl),
          licitacoes:licitacao_id (numero, orgao, portal, data_abertura, data_limite, valor, modalidade, uf, municipio, metodo_envio, email_destino, objeto),
          propostas:proposta_id (valor_proposta, status)
        `)
        .eq("ativo", true)
        .in("status", ["aguardando", "conectando", "na_sala", "disputando", "testando_login"]);

      if (error) throw error;

      console.log(`[robo-controle] poll → ${data?.length || 0} configs ativas encontradas`);
      if (data?.length) {
        data.forEach((c: any) => console.log(`  📋 config=${c.id} empresa=${c.empresas?.nome} status=${c.status}`));
      }

      return new Response(JSON.stringify({ configs: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: Agent updates robot status / heartbeat ───
    if (req.method === "POST" && action === "heartbeat") {
      const body = await req.json();
      const { config_id, status, erro_mensagem } = body;
      console.log(`[robo-controle] heartbeat → config=${config_id} status=${status} erro=${erro_mensagem || 'nenhum'}`);

      if (!config_id) {
        return new Response(JSON.stringify({ error: "config_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const update: Record<string, unknown> = {
        ultimo_heartbeat: new Date().toISOString(),
      };
      if (status) update.status = status;
      if (erro_mensagem !== undefined) update.erro_mensagem = erro_mensagem;

      const { error } = await supabase
        .from("robo_configuracao")
        .update(update)
        .eq("id", config_id);

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: Agent registers a bid event ───
    if (req.method === "POST" && action === "lance") {
      const body = await req.json();
      const { config_id, licitacao_id, empresa_id, proposta_id, evento, valor_lance, posicao, competidores, menor_lance, detalhes } = body;

      if (!licitacao_id || !empresa_id || !proposta_id || !evento) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios: licitacao_id, empresa_id, proposta_id, evento" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("historico_disputas").insert({
        licitacao_id,
        empresa_id,
        proposta_id,
        evento,
        valor_lance: valor_lance ?? null,
        posicao: posicao ?? null,
        competidores: competidores ?? null,
        menor_lance: menor_lance ?? null,
        detalhes: detalhes ?? null,
      });

      if (error) throw error;

      // Update config status if provided
      if (config_id) {
        await supabase
          .from("robo_configuracao")
          .update({ status: "disputando", ultimo_heartbeat: new Date().toISOString() })
          .eq("id", config_id);
      }

      // If robot confirms submission (proposta_enviada event), update proposal status + timestamp
      if (evento === "proposta_enviada" && proposta_id) {
        await supabase
          .from("propostas")
          .update({ status: "Enviada", enviado_em: new Date().toISOString() })
          .eq("id", proposta_id);

        // Also update licitacao to Em Disputa
        if (licitacao_id) {
          await supabase
            .from("licitacoes")
            .update({ status: "Em Disputa" })
            .eq("id", licitacao_id);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: Agent gets certificate download URL ───
    if (req.method === "POST" && action === "certificado") {
      const body = await req.json();
      const { certificado_path } = body;

      if (!certificado_path) {
        return new Response(JSON.stringify({ error: "certificado_path obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // List files in the path to find the cert
      const { data: files } = await supabase.storage
        .from("certificados-digitais")
        .list(certificado_path);

      const certFile = files?.find(f => f.name.endsWith(".pfx") || f.name.endsWith(".p12"));
      if (!certFile) {
        return new Response(JSON.stringify({ error: "Certificado não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fullPath = `${certificado_path}${certFile.name}`;
      const { data: signedUrl } = await supabase.storage
        .from("certificados-digitais")
        .createSignedUrl(fullPath, 300); // 5 min expiry

      return new Response(JSON.stringify({ url: signedUrl?.signedUrl, filename: certFile.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: Agent sends proposal via email (for dispensas without portal submission) ───
    if (req.method === "POST" && action === "enviar-email") {
      const body = await req.json();
      const { config_id, licitacao_id, empresa_id, proposta_id } = body;

      if (!config_id || !licitacao_id || !empresa_id) {
        return new Response(JSON.stringify({ error: "config_id, licitacao_id e empresa_id obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch licitacao with email_destino
      const { data: lic, error: licErr } = await supabase
        .from("licitacoes")
        .select("numero, orgao, objeto, valor, modalidade, email_destino, metodo_envio")
        .eq("id", licitacao_id)
        .single();

      if (licErr || !lic) {
        return new Response(JSON.stringify({ error: "Licitação não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch empresa
      const { data: emp, error: empErr } = await supabase
        .from("empresas")
        .select("nome, cnpj, razao_social, email, telefone, endereco, papel_timbrado_url")
        .eq("id", empresa_id)
        .single();

      if (empErr || !emp) {
        return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch proposta value
      let valorProposta = lic.valor;
      if (proposta_id) {
        const { data: prop } = await supabase
          .from("propostas")
          .select("valor_proposta")
          .eq("id", proposta_id)
          .single();
        if (prop) valorProposta = prop.valor_proposta;
      }

      // Determine email destination
      const emailDestino = lic.email_destino || body.email_destino;
      if (!emailDestino) {
        return new Response(JSON.stringify({
          error: "Nenhum email de destino configurado para esta licitação. Atualize o campo email_destino na licitação.",
          licitacao_numero: lic.numero,
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call notificar function to send proposal email with PDF
      const notificarUrl = `${supabaseUrl}/functions/v1/notificar`;
      const notificarPayload = {
        tipo: "proposta_email",
        destinatario_email: emailDestino,
        licitacao_id,
        dados: {
          empresa_nome: emp.nome,
          empresa_cnpj: emp.cnpj,
          licitacao_numero: lic.numero,
          licitacao_orgao: lic.orgao,
          licitacao_objeto: lic.objeto,
          valor_proposta: valorProposta,
        },
      };

      console.log(`[enviar-email] Enviando proposta por email para ${emailDestino}...`);
      console.log(`[enviar-email] Licitação: ${lic.numero} | Empresa: ${emp.nome} | Valor: R$ ${valorProposta}`);

      const notificarRes = await fetch(notificarUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
        body: JSON.stringify(notificarPayload),
      });

      const notificarResult = await notificarRes.json();

      if (!notificarRes.ok || !notificarResult.success) {
        console.error(`[enviar-email] Falha ao enviar: ${JSON.stringify(notificarResult)}`);

        // Register error event
        await supabase.from("historico_disputas").insert({
          licitacao_id, empresa_id, proposta_id: proposta_id || licitacao_id,
          evento: "email_envio_falha",
          detalhes: { erro: notificarResult.error || "Falha ao enviar email", email_destino: emailDestino },
        });

        return new Response(JSON.stringify({
          error: "Falha ao enviar proposta por email",
          details: notificarResult,
        }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[enviar-email] ✅ Proposta enviada com sucesso via ${notificarResult.method}`);

      // Register success event
      await supabase.from("historico_disputas").insert({
        licitacao_id, empresa_id, proposta_id: proposta_id || licitacao_id,
        evento: "proposta_enviada_email",
        valor_lance: valorProposta,
        detalhes: {
          email_destino: emailDestino,
          metodo: notificarResult.method,
          pdf_gerado: true,
          timestamp: new Date().toISOString(),
        },
      });

      // Update proposta status
      if (proposta_id) {
        await supabase
          .from("propostas")
          .update({ status: "Enviada", enviado_em: new Date().toISOString() })
          .eq("id", proposta_id);
      }

      // Finalize config
      await supabase
        .from("robo_configuracao")
        .update({ status: "finalizado", ativo: false, ultimo_heartbeat: new Date().toISOString() })
        .eq("id", config_id);

      return new Response(JSON.stringify({
        ok: true,
        email_enviado: true,
        email_destino: emailDestino,
        metodo: notificarResult.method,
        licitacao: lic.numero,
        empresa: emp.nome,
        valor: valorProposta,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: Test certificate login on Gov.br ───
    if (req.method === "POST" && action === "testar-login") {
      const body = await req.json();
      const { empresa_id, user_id } = body;

      console.log(`[robo-controle] testar-login → empresa=${empresa_id} user=${user_id}`);

      if (!empresa_id || !user_id) {
        console.log(`[robo-controle] ❌ testar-login: campos faltando`);
        return new Response(JSON.stringify({ error: "empresa_id e user_id obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean up any stale test configs (older than 3 minutes)
      const { data: existing } = await supabase
        .from("robo_configuracao")
        .select("id, status, created_at")
        .eq("empresa_id", empresa_id)
        .eq("status", "testando_login")
        .eq("ativo", true);

      if (existing && existing.length > 0) {
        console.log(`[robo-controle] testar-login: ${existing.length} configs existentes encontradas`);
        const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
        const stale = existing.filter((e: any) => e.created_at < threeMinAgo);
        const active = existing.filter((e: any) => e.created_at >= threeMinAgo);

        // Clean up stale tests
        if (stale.length > 0) {
          console.log(`[robo-controle] testar-login: limpando ${stale.length} testes expirados`);
          await supabase
            .from("robo_configuracao")
            .update({ ativo: false, status: "finalizado", erro_mensagem: "Timeout - teste expirado" })
            .in("id", stale.map((e: any) => e.id));
        }

        // If there's still an active recent test, block
        if (active.length > 0) {
          console.log(`[robo-controle] ⚠️ testar-login: teste ativo já existe config=${active[0].id}`);
          return new Response(JSON.stringify({ error: "Já existe um teste em andamento", config_id: active[0].id }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Find any licitacao to use as reference (required by FK)
      const { data: anyLic } = await supabase
        .from("licitacoes")
        .select("id")
        .limit(1)
        .single();

      if (!anyLic) {
        return new Response(JSON.stringify({ error: "Nenhuma licitação encontrada para referência" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create or reuse temporary test config (upsert to avoid unique constraint)
      const { data: config, error: insertErr } = await supabase
        .from("robo_configuracao")
        .upsert({
          user_id,
          empresa_id,
          licitacao_id: anyLic.id,
          ativo: true,
          status: "testando_login",
          erro_mensagem: null,
        }, { onConflict: "empresa_id,licitacao_id" })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      console.log(`[robo-controle] ✅ testar-login: config criada/atualizada id=${config.id}`);

      return new Response(JSON.stringify({ ok: true, config_id: config.id, message: "Teste de login iniciado. O robô tentará autenticar no Gov.br." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET: Check test login status ───
    if (req.method === "GET" && action === "testar-login-status") {
      const configId = url.searchParams.get("config_id");
      console.log(`[robo-controle] testar-login-status → config=${configId}`);
      if (!configId) {
        return new Response(JSON.stringify({ error: "config_id obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("robo_configuracao")
        .select("id, status, erro_mensagem, ultimo_heartbeat, ativo")
        .eq("id", configId)
        .single();

      if (error) throw error;

      console.log(`[robo-controle] testar-login-status → status=${data?.status} ativo=${data?.ativo} erro=${data?.erro_mensagem || 'nenhum'}`);

      return new Response(JSON.stringify({ config: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: Frontend triggers immediate proposal submission ───
    if (req.method === "POST" && action === "enviar-proposta") {
      const body = parsedBody || await req.json();
      const { proposta_id, licitacao_id, empresa_id, autorizacao } = body as Record<string, string>;

      // GATE_LEGAL: exige autorização explícita do usuário
      const headerAuth = req.headers.get("x-autorizacao-participacao") || "";
      const REQUIRED = "AUTORIZAR_PARTICIPAÇÃO";
      if (autorizacao !== REQUIRED && headerAuth !== REQUIRED) {
        console.warn(`[robo-controle] ❌ enviar-proposta BLOQUEADO: autorização ausente`);
        return new Response(JSON.stringify({
          error: "Ação bloqueada: autorização explícita ausente. Envie 'AUTORIZAR_PARTICIPAÇÃO'.",
          code: "AUTORIZACAO_REQUERIDA",
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log(`[robo-controle] enviar-proposta → proposta=${proposta_id} licitacao=${licitacao_id} empresa=${empresa_id}`);

      if (!proposta_id || !licitacao_id || !empresa_id) {
        return new Response(JSON.stringify({ error: "proposta_id, licitacao_id e empresa_id obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user_id from proposta's empresa
      const { data: emp } = await supabase
        .from("empresas")
        .select("user_id")
        .eq("id", empresa_id)
        .single();

      if (!emp) {
        return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert config to avoid duplicate key violation
      const { data: config, error: upsertErr } = await supabase
        .from("robo_configuracao")
        .upsert({
          user_id: emp.user_id,
          empresa_id,
          licitacao_id,
          proposta_id,
          ativo: true,
          status: "aguardando",
          erro_mensagem: null,
          ultimo_heartbeat: new Date().toISOString(),
        }, { onConflict: "empresa_id,licitacao_id" })
        .select("id")
        .single();

      if (upsertErr) throw upsertErr;

      console.log(`[robo-controle] ✅ enviar-proposta: config upserted id=${config.id}`);
      return new Response(JSON.stringify({ ok: true, config_id: config.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[robo-controle] ❌ Ação não reconhecida: action=${action} method=${req.method}`);
    return new Response(JSON.stringify({ error: "Ação não reconhecida. Use ?action=poll|heartbeat|lance|certificado|enviar-email|enviar-proposta|testar-login|testar-login-status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Erro robo-controle:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
