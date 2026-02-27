import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificacaoPayload {
  tipo: 'nova_licitacao' | 'prazo_vencendo' | 'resultado_disputa' | 'alerta_compliance' | 'proposta_email';
  destinatario_email?: string;
  destinatario?: string; // alias used by the robot agent
  licitacao_id?: string;
  titulo?: string;
  mensagem?: string;
  dados?: Record<string, unknown>;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const VALID_TIPOS = ['nova_licitacao', 'prazo_vencendo', 'resultado_disputa', 'alerta_compliance', 'proposta_email'];

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!num && num !== 0) return 'N/A';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificacaoPayload = await req.json();

    // Normalize destinatario field
    if (!payload.destinatario_email && payload.destinatario) {
      payload.destinatario_email = payload.destinatario;
    }

    // ── Validation ──
    if (!payload.tipo || !VALID_TIPOS.includes(payload.tipo)) {
      return new Response(JSON.stringify({ success: false, error: 'Tipo de notificação inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For proposta_email, titulo/mensagem are optional (auto-generated)
    if (payload.tipo !== 'proposta_email') {
      if (!payload.titulo || typeof payload.titulo !== 'string' || payload.titulo.trim().length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Título é obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (payload.titulo.length > 200) {
        return new Response(JSON.stringify({ success: false, error: 'Título muito longo' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!payload.mensagem || typeof payload.mensagem !== 'string' || payload.mensagem.trim().length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Mensagem é obrigatória' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (payload.destinatario_email && !isValidEmail(payload.destinatario_email)) {
      return new Response(JSON.stringify({ success: false, error: 'Email inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.licitacao_id && !isValidUUID(payload.licitacao_id)) {
      return new Response(JSON.stringify({ success: false, error: 'ID de licitação inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Notificação] Tipo: ${payload.tipo}`);

    // ═══════════════════════════════════════════════
    // ═══ PROPOSTA POR EMAIL ═══
    // ═══════════════════════════════════════════════
    if (payload.tipo === 'proposta_email') {
      const dados = payload.dados || {};
      const emailDestino = payload.destinatario_email;

      if (!emailDestino) {
        return new Response(JSON.stringify({ success: false, error: 'Email de destino é obrigatório para proposta_email' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const empresaNome = String(dados.empresa_nome || 'Empresa');
      const empresaCnpj = String(dados.empresa_cnpj || '');
      const licitacaoNumero = String(dados.licitacao_numero || '');
      const licitacaoOrgao = String(dados.licitacao_orgao || '');
      const licitacaoObjeto = String(dados.licitacao_objeto || '');
      const valorProposta = dados.valor_proposta;

      // Try to fetch empresa SMTP config from DB
      let smtpConfig = null;
      let empresaEmail = null;
      let empresaTelefone = null;
      let empresaEndereco = null;

      if (empresaCnpj) {
        const cnpjClean = empresaCnpj.replace(/\D/g, '');
        const { data: empresa } = await supabase
          .from('empresas')
          .select('email, telefone, endereco, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_password, email_smtp_ssl')
          .or(`cnpj.eq.${empresaCnpj},cnpj.eq.${cnpjClean},cnpj.eq.${formatCNPJ(cnpjClean)}`)
          .limit(1)
          .single();

        if (empresa) {
          empresaEmail = empresa.email;
          empresaTelefone = empresa.telefone;
          empresaEndereco = empresa.endereco;
          if (empresa.email_smtp_host && empresa.email_smtp_user && empresa.email_smtp_password) {
            smtpConfig = {
              host: empresa.email_smtp_host,
              port: empresa.email_smtp_port || 587,
              user: empresa.email_smtp_user,
              password: empresa.email_smtp_password,
              ssl: empresa.email_smtp_ssl ?? true,
            };
          }
        }
      }

      const assunto = `Proposta Comercial - ${escapeHtml(licitacaoNumero)} - ${escapeHtml(empresaNome)}`;
      const htmlProposta = generatePropostaEmailHtml({
        empresaNome,
        empresaCnpj,
        empresaEmail,
        empresaTelefone,
        empresaEndereco,
        licitacaoNumero,
        licitacaoOrgao,
        licitacaoObjeto,
        valorProposta,
      });

      let enviado = false;
      let metodo = 'nenhum';

      // ── Attempt 1: SMTP da empresa ──
      if (smtpConfig) {
        console.log(`[Proposta] Tentando enviar via SMTP da empresa: ${smtpConfig.host}`);
        // Deno edge functions don't have native SMTP client, so we skip this for now
        // In production, you'd use a Deno SMTP library or relay service
        console.log(`[Proposta] SMTP direto não suportado em Edge Functions - usando Resend`);
      }

      // ── Attempt 2: Resend API ──
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!enviado && resendApiKey) {
        try {
          const fromEmail = empresaEmail
            ? `${escapeHtml(empresaNome)} <${empresaEmail}>`
            : `${escapeHtml(empresaNome)} <propostas@resend.dev>`;

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [emailDestino],
              subject: assunto,
              html: htmlProposta,
              reply_to: empresaEmail || undefined,
            }),
          });

          if (emailResponse.ok) {
            const result = await emailResponse.json();
            console.log(`[Proposta] ✅ Email enviado via Resend: ${result.id}`);
            enviado = true;
            metodo = 'resend';
          } else {
            const err = await emailResponse.text();
            console.error(`[Proposta] Erro Resend: ${err}`);
          }
        } catch (err) {
          console.error(`[Proposta] Erro envio Resend:`, err);
        }
      }

      // ── Attempt 3: Lovable AI email (fallback) ──
      if (!enviado) {
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        if (lovableApiKey) {
          console.log(`[Proposta] Tentando envio via Lovable AI...`);
          // Lovable doesn't provide email sending, log only
        }
        console.log(`[Proposta] ⚠️ Nenhum serviço de email configurado`);
        metodo = 'log_only';
      }

      // Log audit
      await supabase.from('logs_auditoria').insert({
        acao: 'proposta_enviada_email',
        entidade: 'propostas',
        entidade_id: payload.licitacao_id || null,
        dados_novos: {
          destinatario: emailDestino,
          empresa: empresaNome,
          licitacao: licitacaoNumero,
          valor: valorProposta,
          metodo_envio: metodo,
          enviado,
        },
      });

      return new Response(JSON.stringify({
        success: enviado,
        method: metodo,
        message: enviado
          ? `Proposta enviada com sucesso para ${emailDestino}`
          : 'Proposta registrada mas email não configurado (configure RESEND_API_KEY)',
        dados: {
          destinatario: emailDestino,
          assunto,
          empresa: empresaNome,
          valor: formatCurrency(valorProposta as number),
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════
    // ═══ NOTIFICAÇÕES PADRÃO ═══
    // ═══════════════════════════════════════════════
    await supabase.from('logs_auditoria').insert({
      acao: 'notificacao_enviada',
      entidade: 'notificacoes',
      entidade_id: payload.licitacao_id || null,
      dados_novos: {
        tipo: payload.tipo,
        email_enviado: !!payload.destinatario_email,
      },
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && payload.destinatario_email) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LicitaIA <notificacoes@resend.dev>',
            to: [payload.destinatario_email],
            subject: `[LicitaIA] ${escapeHtml(payload.titulo!)}`,
            html: generateNotificacaoEmailHtml(payload),
          }),
        });

        if (emailResponse.ok) {
          console.log('[Notificação] Email enviado com sucesso');
          return new Response(JSON.stringify({ success: true, method: 'email', message: 'Notificação enviada' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const errorText = await emailResponse.text();
        console.error('[Notificação] Erro email:', errorText);
      } catch (emailError) {
        console.error('[Notificação] Erro envio:', emailError);
      }
    }

    return new Response(JSON.stringify({ success: true, method: 'log', message: 'Notificação registrada' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Notificação] Erro:', error);
    return new Response(JSON.stringify({ success: false, error: 'Erro ao processar notificação' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ═══════════════════════════════════════════════════
// ═══ TEMPLATE: PROPOSTA COMERCIAL ═══
// ═══════════════════════════════════════════════════
interface PropostaData {
  empresaNome: string;
  empresaCnpj: string;
  empresaEmail: string | null;
  empresaTelefone: string | null;
  empresaEndereco: string | null;
  licitacaoNumero: string;
  licitacaoOrgao: string;
  licitacaoObjeto: string;
  valorProposta: unknown;
}

function generatePropostaEmailHtml(d: PropostaData): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const valor = formatCurrency(d.valorProposta as number);
  const cnpjFormatado = d.empresaCnpj ? formatCNPJ(d.empresaCnpj) : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
<tr><td style="padding:32px 16px;">
<table role="presentation" width="640" align="center" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">

<!-- Header com dados da empresa -->
<tr><td style="background:#1e293b;padding:28px 32px;">
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
    ${escapeHtml(d.empresaNome)}
  </h1>
  ${cnpjFormatado ? `<p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">CNPJ: ${escapeHtml(cnpjFormatado)}</p>` : ''}
  ${d.empresaEmail ? `<p style="margin:2px 0 0;color:#94a3b8;font-size:13px;">${escapeHtml(d.empresaEmail)}</p>` : ''}
  ${d.empresaTelefone ? `<p style="margin:2px 0 0;color:#94a3b8;font-size:13px;">Tel: ${escapeHtml(d.empresaTelefone)}</p>` : ''}
</td></tr>

<!-- Título -->
<tr><td style="padding:28px 32px 0;">
  <h2 style="margin:0;color:#1e293b;font-size:20px;font-weight:600;border-bottom:2px solid #3b82f6;padding-bottom:12px;">
    📄 PROPOSTA COMERCIAL
  </h2>
  <p style="margin:12px 0 0;color:#64748b;font-size:14px;">
    Data: ${hoje}
  </p>
</td></tr>

<!-- Dados da Licitação -->
<tr><td style="padding:24px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Referência</p>
      <p style="margin:4px 0 0;color:#1e293b;font-size:15px;font-weight:600;">${escapeHtml(d.licitacaoNumero)}</p>
    </td></tr>
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Órgão</p>
      <p style="margin:4px 0 0;color:#1e293b;font-size:15px;">${escapeHtml(d.licitacaoOrgao)}</p>
    </td></tr>
    <tr><td style="padding:16px 20px;">
      <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Objeto</p>
      <p style="margin:4px 0 0;color:#1e293b;font-size:14px;line-height:1.5;">${escapeHtml(d.licitacaoObjeto.substring(0, 500))}</p>
    </td></tr>
  </table>
</td></tr>

<!-- Valor da Proposta -->
<tr><td style="padding:0 32px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:8px;">
    <tr><td style="padding:24px;text-align:center;">
      <p style="margin:0;color:#bfdbfe;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Valor Global da Proposta</p>
      <p style="margin:8px 0 0;color:#ffffff;font-size:32px;font-weight:700;">${escapeHtml(valor)}</p>
    </td></tr>
  </table>
</td></tr>

<!-- Declarações -->
<tr><td style="padding:0 32px 24px;">
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;">
    <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
      <strong>✅ Declarações:</strong><br>
      • Nos preços apresentados estão incluídos todos os custos diretos e indiretos, tributos, encargos sociais e trabalhistas, fretes e quaisquer outros custos e despesas.<br>
      • Os dados do responsável legal da empresa e demais condições estão disponíveis mediante solicitação.<br>
      • A validade desta proposta é de 60 (sessenta) dias corridos, contados da data de sua apresentação.
    </p>
  </div>
</td></tr>

<!-- Contato -->
<tr><td style="padding:0 32px 28px;">
  <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
    Colocamo-nos à disposição para quaisquer esclarecimentos.<br>
    ${d.empresaEndereco ? escapeHtml(d.empresaEndereco) + '<br>' : ''}
    ${d.empresaTelefone ? 'Tel: ' + escapeHtml(d.empresaTelefone) + '<br>' : ''}
    ${d.empresaEmail ? 'Email: ' + escapeHtml(d.empresaEmail) : ''}
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0;color:#94a3b8;font-size:11px;">
    Proposta gerada eletronicamente em ${hoje} • ${escapeHtml(d.empresaNome)}
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════
// ═══ TEMPLATE: NOTIFICAÇÃO PADRÃO ═══
// ═══════════════════════════════════════════════════
function generateNotificacaoEmailHtml(payload: NotificacaoPayload): string {
  const tipoStyles: Record<string, { color: string; icon: string }> = {
    nova_licitacao: { color: '#00C9B7', icon: '📋' },
    prazo_vencendo: { color: '#F59E0B', icon: '⏰' },
    resultado_disputa: { color: '#10B981', icon: '🏆' },
    alerta_compliance: { color: '#EF4444', icon: '⚠️' },
  };

  const style = tipoStyles[payload.tipo] || { color: '#00C9B7', icon: '📬' };
  const safeTitulo = escapeHtml(payload.titulo || '');
  const safeMensagem = escapeHtml(payload.mensagem || '');

  let dadosHtml = '';
  if (payload.dados && Object.keys(payload.dados).length > 0) {
    const rows = Object.entries(payload.dados).slice(0, 10)
      .map(([key, value]) => `
        <tr>
          <td style="padding:12px 16px;color:#9ca3af;font-size:14px;border-bottom:1px solid #374151;">${escapeHtml(String(key).substring(0, 50))}</td>
          <td style="padding:12px 16px;color:#f9fafb;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid #374151;">${escapeHtml(String(value).substring(0, 200))}</td>
        </tr>
      `).join('');
    dadosHtml = `<table role="presentation" style="width:100%;background:#1f2937;border-radius:12px;margin-bottom:24px;">${rows}</table>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1c;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%"><tr><td style="padding:40px 20px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
  <tr><td style="padding:32px;background:linear-gradient(135deg,#00C9B7,#0EA5E9);text-align:center;">
    <h1 style="margin:0;color:#0a0f1c;font-size:28px;font-weight:700;">🤖 LicitaIA</h1>
    <p style="margin:8px 0 0;color:#0a0f1c;font-size:14px;opacity:0.8;">Robô de Capital 24/7</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <div style="font-size:32px;margin-bottom:16px;">${style.icon}</div>
    <h2 style="margin:0 0 16px;color:#f9fafb;font-size:24px;font-weight:600;">${safeTitulo}</h2>
    <p style="margin:0 0 24px;color:#9ca3af;font-size:16px;line-height:1.6;">${safeMensagem}</p>
    ${dadosHtml}
  </td></tr>
  <tr><td style="padding:24px 32px;background:#0d1117;border-top:1px solid #1f2937;text-align:center;">
    <p style="margin:0;color:#6b7280;font-size:12px;">LicitaIA - Operando em conformidade com a Lei 14.133/2021</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
