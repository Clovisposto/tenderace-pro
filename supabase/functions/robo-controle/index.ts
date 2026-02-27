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
    const action = url.searchParams.get("action");

    // ─── GET: Agent polls for active robot configs ───
    if (req.method === "GET" && action === "poll") {
      const { data, error } = await supabase
        .from("robo_configuracao")
        .select(`
          *,
          empresas:empresa_id (nome, cnpj, certificado_digital_tipo, email, telefone, endereco, razao_social, papel_timbrado_url, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_password, email_smtp_ssl),
          licitacoes:licitacao_id (numero, orgao, portal, data_abertura, data_limite, valor, modalidade, uf, municipio, metodo_envio, email_destino, objeto),
          propostas:proposta_id (valor_proposta, status)
        `)
        .eq("ativo", true)
        .in("status", ["aguardando", "conectando", "na_sala", "disputando"]);

      if (error) throw error;

      return new Response(JSON.stringify({ configs: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: Agent updates robot status / heartbeat ───
    if (req.method === "POST" && action === "heartbeat") {
      const body = await req.json();
      const { config_id, status, erro_mensagem } = body;

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

    return new Response(JSON.stringify({ error: "Ação não reconhecida. Use ?action=poll|heartbeat|lance|certificado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro robo-controle:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
