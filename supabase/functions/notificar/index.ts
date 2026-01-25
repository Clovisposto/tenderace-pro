import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificacaoPayload {
  tipo: 'nova_licitacao' | 'prazo_vencendo' | 'resultado_disputa' | 'alerta_compliance';
  destinatario_email?: string;
  licitacao_id?: string;
  titulo: string;
  mensagem: string;
  dados?: Record<string, unknown>;
}

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// UUID validation
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Valid notification types
const VALID_TIPOS = ['nova_licitacao', 'prazo_vencendo', 'resultado_disputa', 'alerta_compliance'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificacaoPayload = await req.json();

    // ====== INPUT VALIDATION ======
    
    // Validate tipo
    if (!payload.tipo || !VALID_TIPOS.includes(payload.tipo)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tipo de notificação inválido'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate titulo (required, max 200 chars)
    if (!payload.titulo || typeof payload.titulo !== 'string' || payload.titulo.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Título é obrigatório'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.titulo.length > 200) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Título muito longo (máximo 200 caracteres)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate mensagem (required, max 5000 chars)
    if (!payload.mensagem || typeof payload.mensagem !== 'string' || payload.mensagem.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Mensagem é obrigatória'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.mensagem.length > 5000) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Mensagem muito longa (máximo 5000 caracteres)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format if provided
    if (payload.destinatario_email) {
      if (typeof payload.destinatario_email !== 'string' || !isValidEmail(payload.destinatario_email)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Email inválido'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (payload.destinatario_email.length > 255) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Email muito longo (máximo 255 caracteres)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate licitacao_id format if provided
    if (payload.licitacao_id) {
      if (typeof payload.licitacao_id !== 'string' || !isValidUUID(payload.licitacao_id)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'ID de licitação inválido'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate dados object if provided
    if (payload.dados !== undefined) {
      if (typeof payload.dados !== 'object' || payload.dados === null || Array.isArray(payload.dados)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Dados deve ser um objeto'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Limit dados size
      const dadosStr = JSON.stringify(payload.dados);
      if (dadosStr.length > 10000) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Dados muito grandes (máximo 10KB)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ====== END INPUT VALIDATION ======

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Notificação] Tipo: ${payload.tipo}`);

    // Log the notification to audit
    await supabase.from('logs_auditoria').insert({
      acao: 'notificacao_enviada',
      entidade: 'notificacoes',
      entidade_id: payload.licitacao_id || null,
      dados_novos: {
        tipo: payload.tipo,
        email_enviado: !!resendApiKey && !!payload.destinatario_email,
      },
    });

    // Send email if Resend is configured
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
            subject: `[LicitaIA] ${escapeHtml(payload.titulo)}`,
            html: generateEmailHtml(payload),
          }),
        });

        if (emailResponse.ok) {
          console.log('[Notificação] Email enviado com sucesso');
          return new Response(JSON.stringify({
            success: true,
            method: 'email',
            message: 'Notificação enviada por email'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errorText = await emailResponse.text();
          console.error('[Notificação] Erro ao enviar email:', errorText);
        }
      } catch (emailError) {
        console.error('[Notificação] Erro no envio de email:', emailError);
      }
    }

    // Fallback: Log notification (could be extended to push notifications, SMS, etc.)
    console.log('[Notificação] Email não configurado ou falhou - notificação registrada apenas no log');

    return new Response(JSON.stringify({
      success: true,
      method: 'log',
      message: 'Notificação registrada (email não configurado)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Notificação] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao processar notificação'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateEmailHtml(payload: NotificacaoPayload): string {
  const tipoStyles = {
    nova_licitacao: { color: '#00C9B7', icon: '📋' },
    prazo_vencendo: { color: '#F59E0B', icon: '⏰' },
    resultado_disputa: { color: '#10B981', icon: '🏆' },
    alerta_compliance: { color: '#EF4444', icon: '⚠️' },
  };

  const style = tipoStyles[payload.tipo] || { color: '#00C9B7', icon: '📬' };

  // CRITICAL: Escape all user-provided content to prevent XSS
  const safeTitulo = escapeHtml(payload.titulo);
  const safeMensagem = escapeHtml(payload.mensagem);

  // Safely render dados if present
  let dadosHtml = '';
  if (payload.dados && Object.keys(payload.dados).length > 0) {
    const rows = Object.entries(payload.dados)
      .slice(0, 10) // Limit to 10 rows
      .map(([key, value]) => {
        const safeKey = escapeHtml(String(key).substring(0, 50));
        const safeValue = escapeHtml(String(value).substring(0, 200));
        return `
          <tr>
            <td style="padding: 12px 16px; color: #9ca3af; font-size: 14px; border-bottom: 1px solid #374151;">
              ${safeKey}
            </td>
            <td style="padding: 12px 16px; color: #f9fafb; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #374151;">
              ${safeValue}
            </td>
          </tr>
        `;
      }).join('');
    
    dadosHtml = `
      <table role="presentation" style="width: 100%; background-color: #1f2937; border-radius: 12px; margin-bottom: 24px;">
        ${rows}
      </table>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitulo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0f1c; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1f2937;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #00C9B7, #0EA5E9); text-align: center;">
              <h1 style="margin: 0; color: #0a0f1c; font-size: 28px; font-weight: 700;">
                🤖 LicitaIA
              </h1>
              <p style="margin: 8px 0 0; color: #0a0f1c; font-size: 14px; opacity: 0.8;">
                Robô de Capital 24/7
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 32px; margin-bottom: 16px;">${style.icon}</div>
              <h2 style="margin: 0 0 16px; color: #f9fafb; font-size: 24px; font-weight: 600;">
                ${safeTitulo}
              </h2>
              <p style="margin: 0 0 24px; color: #9ca3af; font-size: 16px; line-height: 1.6;">
                ${safeMensagem}
              </p>
              
              ${dadosHtml}
              
              <a href="#" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #00C9B7, #0EA5E9); color: #0a0f1c; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                Ver no Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0d1117; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                LicitaIA - Sistema de Licitações com IA<br>
                Operando em conformidade com a Lei 14.133/2021
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
