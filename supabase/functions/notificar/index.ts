import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificacaoPayload {
  tipo: 'nova_licitacao' | 'prazo_vencendo' | 'resultado_disputa' | 'alerta_compliance' | 'proposta_email';
  destinatario_email?: string;
  destinatario?: string;
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

// ═══════════════════════════════════════════════════
// ═══ PDF GENERATION WITH LETTERHEAD ═══
// ═══════════════════════════════════════════════════

interface PdfPropostaData {
  empresaNome: string;
  empresaCnpj: string;
  empresaEmail: string | null;
  empresaTelefone: string | null;
  empresaEndereco: string | null;
  empresaRazaoSocial: string | null;
  licitacaoNumero: string;
  licitacaoOrgao: string;
  licitacaoObjeto: string;
  valorProposta: number;
  papelTimbradoBytes: Uint8Array | null;
  papelTimbradoType: string | null; // 'pdf', 'png', 'jpg'
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

async function generatePropostaPdf(d: PdfPropostaData): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  let startY = 720; // default content start Y

  // If letterhead is a PDF, use it as base; otherwise create new doc
  if (d.papelTimbradoBytes && d.papelTimbradoType === 'pdf') {
    try {
      const letterheadDoc = await PDFDocument.load(d.papelTimbradoBytes);
      pdfDoc = await PDFDocument.create();
      const [copiedPage] = await pdfDoc.copyPages(letterheadDoc, [0]);
      pdfDoc.addPage(copiedPage);
      startY = copiedPage.getHeight() - 160; // leave space for letterhead header
    } catch (e) {
      console.error('[PDF] Erro ao carregar papel timbrado PDF:', e);
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]); // A4
    }
  } else {
    pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4

    // If letterhead is an image, embed as background
    if (d.papelTimbradoBytes && d.papelTimbradoType) {
      try {
        let img;
        if (d.papelTimbradoType === 'png') {
          img = await pdfDoc.embedPng(d.papelTimbradoBytes);
        } else {
          img = await pdfDoc.embedJpg(d.papelTimbradoBytes);
        }
        const { width, height } = page.getSize();
        page.drawImage(img, { x: 0, y: 0, width, height });
        startY = height - 160;
      } catch (e) {
        console.error('[PDF] Erro ao embedar imagem de timbrado:', e);
      }
    }
  }

  const page = pdfDoc.getPages()[0];
  const { width } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const cnpjFormatado = d.empresaCnpj ? formatCNPJ(d.empresaCnpj) : '';
  const valor = formatCurrency(d.valorProposta);
  const marginLeft = 60;
  const contentWidth = width - 120;
  let y = startY;

  const darkBlue = rgb(0.118, 0.161, 0.231); // #1e293b
  const gray = rgb(0.396, 0.455, 0.525); // #64748b
  const blue = rgb(0.231, 0.51, 0.965); // #3b82f6
  const black = rgb(0, 0, 0);

  // If no letterhead, draw a simple company header
  if (!d.papelTimbradoBytes) {
    // Header bar
    page.drawRectangle({ x: 0, y: page.getHeight() - 100, width, height: 100, color: darkBlue });
    page.drawText(d.empresaNome.toUpperCase(), { x: marginLeft, y: page.getHeight() - 45, size: 18, font: fontBold, color: rgb(1, 1, 1) });
    if (cnpjFormatado) {
      page.drawText(`CNPJ: ${cnpjFormatado}`, { x: marginLeft, y: page.getHeight() - 65, size: 10, font: fontRegular, color: rgb(0.75, 0.8, 0.85) });
    }
    const contactParts: string[] = [];
    if (d.empresaEmail) contactParts.push(d.empresaEmail);
    if (d.empresaTelefone) contactParts.push(`Tel: ${d.empresaTelefone}`);
    if (contactParts.length > 0) {
      page.drawText(contactParts.join(' • '), { x: marginLeft, y: page.getHeight() - 80, size: 9, font: fontRegular, color: rgb(0.75, 0.8, 0.85) });
    }
    y = page.getHeight() - 130;
  }

  // ── Title ──
  page.drawText('PROPOSTA COMERCIAL', { x: marginLeft, y, size: 16, font: fontBold, color: darkBlue });
  y -= 5;
  page.drawRectangle({ x: marginLeft, y, width: 200, height: 2, color: blue });
  y -= 20;
  page.drawText(`Data: ${hoje}`, { x: marginLeft, y, size: 10, font: fontRegular, color: gray });
  y -= 30;

  // ── Section: Dados da Licitação ──
  page.drawText('DADOS DA LICITAÇÃO', { x: marginLeft, y, size: 11, font: fontBold, color: darkBlue });
  y -= 4;
  page.drawRectangle({ x: marginLeft, y, width: contentWidth, height: 1, color: rgb(0.88, 0.91, 0.94) });
  y -= 18;

  const fields = [
    { label: 'Número/Referência:', value: d.licitacaoNumero },
    { label: 'Órgão:', value: d.licitacaoOrgao },
  ];
  for (const f of fields) {
    page.drawText(f.label, { x: marginLeft, y, size: 10, font: fontBold, color: gray });
    page.drawText(f.value, { x: marginLeft + 120, y, size: 10, font: fontRegular, color: black });
    y -= 16;
  }

  // Objeto (multi-line)
  page.drawText('Objeto:', { x: marginLeft, y, size: 10, font: fontBold, color: gray });
  y -= 14;
  const objetoLines = wrapText(d.licitacaoObjeto.substring(0, 600), 80);
  for (const line of objetoLines) {
    page.drawText(line, { x: marginLeft + 10, y, size: 9, font: fontRegular, color: black });
    y -= 13;
  }
  y -= 10;

  // ── Valor da Proposta (highlighted box) ──
  const boxH = 55;
  page.drawRectangle({ x: marginLeft, y: y - boxH + 20, width: contentWidth, height: boxH, color: rgb(0.118, 0.251, 0.686) }); // dark blue
  page.drawText('VALOR GLOBAL DA PROPOSTA', { x: marginLeft + 20, y: y + 2, size: 10, font: fontBold, color: rgb(0.75, 0.86, 0.99) });
  page.drawText(valor, { x: marginLeft + 20, y: y - 20, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  y -= boxH + 15;

  // ── Empresa proponente ──
  page.drawText('EMPRESA PROPONENTE', { x: marginLeft, y, size: 11, font: fontBold, color: darkBlue });
  y -= 4;
  page.drawRectangle({ x: marginLeft, y, width: contentWidth, height: 1, color: rgb(0.88, 0.91, 0.94) });
  y -= 18;

  const empFields = [
    { label: 'Razão Social:', value: d.empresaRazaoSocial || d.empresaNome },
    { label: 'CNPJ:', value: cnpjFormatado },
  ];
  if (d.empresaEndereco) empFields.push({ label: 'Endereço:', value: d.empresaEndereco });
  if (d.empresaTelefone) empFields.push({ label: 'Telefone:', value: d.empresaTelefone });
  if (d.empresaEmail) empFields.push({ label: 'E-mail:', value: d.empresaEmail });

  for (const f of empFields) {
    if (!f.value) continue;
    page.drawText(f.label, { x: marginLeft, y, size: 10, font: fontBold, color: gray });
    page.drawText(f.value, { x: marginLeft + 100, y, size: 10, font: fontRegular, color: black });
    y -= 16;
  }
  y -= 10;

  // ── Declarações ──
  page.drawText('DECLARAÇÕES', { x: marginLeft, y, size: 11, font: fontBold, color: darkBlue });
  y -= 4;
  page.drawRectangle({ x: marginLeft, y, width: contentWidth, height: 1, color: rgb(0.88, 0.91, 0.94) });
  y -= 16;

  const declaracoes = [
    'Nos preços apresentados estão incluídos todos os custos diretos e indiretos, tributos, encargos sociais e trabalhistas, fretes e quaisquer outros custos e despesas.',
    'Os dados do responsável legal da empresa e demais condições estão disponíveis mediante solicitação.',
    'A validade desta proposta é de 60 (sessenta) dias corridos, contados da data de sua apresentação.',
    'Declaramos, sob as penas da lei, que cumprimos plenamente os requisitos de habilitação conforme Lei nº 14.133/2021.',
  ];

  for (const decl of declaracoes) {
    const declLines = wrapText(`• ${decl}`, 85);
    for (const line of declLines) {
      if (y < 60) break;
      page.drawText(line, { x: marginLeft + 5, y, size: 9, font: fontRegular, color: gray });
      y -= 12;
    }
    y -= 4;
  }

  // ── Footer ──
  if (y > 80) {
    y = Math.max(y - 20, 50);
    page.drawText(`Proposta gerada eletronicamente em ${hoje}`, { x: marginLeft, y, size: 8, font: fontRegular, color: rgb(0.6, 0.65, 0.7) });
    page.drawText(`${d.empresaNome} • ${cnpjFormatado}`, { x: marginLeft, y: y - 12, size: 8, font: fontRegular, color: rgb(0.6, 0.65, 0.7) });
  }

  return await pdfDoc.save();
}

// ═══════════════════════════════════════════════════
// ═══ MAIN HANDLER ═══
// ═══════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificacaoPayload = await req.json();

    if (!payload.destinatario_email && payload.destinatario) {
      payload.destinatario_email = payload.destinatario;
    }

    if (!payload.tipo || !VALID_TIPOS.includes(payload.tipo)) {
      return new Response(JSON.stringify({ success: false, error: 'Tipo de notificação inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    // ═══ PROPOSTA POR EMAIL COM PDF ═══
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
      const valorProposta = Number(dados.valor_proposta || 0);

      // Fetch empresa details from DB
      let empresaEmail: string | null = null;
      let empresaTelefone: string | null = null;
      let empresaEndereco: string | null = null;
      let empresaRazaoSocial: string | null = null;
      let papelTimbradoPath: string | null = null;

      if (empresaCnpj) {
        const cnpjClean = empresaCnpj.replace(/\D/g, '');
        const { data: empresa } = await supabase
          .from('empresas')
          .select('email, telefone, endereco, razao_social, papel_timbrado_url, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_password, email_smtp_ssl')
          .or(`cnpj.eq.${empresaCnpj},cnpj.eq.${cnpjClean},cnpj.eq.${formatCNPJ(cnpjClean)}`)
          .limit(1)
          .single();

        if (empresa) {
          empresaEmail = empresa.email;
          empresaTelefone = empresa.telefone;
          empresaEndereco = empresa.endereco;
          empresaRazaoSocial = empresa.razao_social;
          papelTimbradoPath = empresa.papel_timbrado_url;
        }
      }

      // Fetch letterhead from storage if available
      let papelTimbradoBytes: Uint8Array | null = null;
      let papelTimbradoType: string | null = null;

      if (papelTimbradoPath) {
        try {
          console.log(`[PDF] Buscando papel timbrado: ${papelTimbradoPath}`);
          const { data: fileData, error: fileError } = await supabase.storage
            .from('papeis-timbrados')
            .download(papelTimbradoPath);

          if (fileData && !fileError) {
            papelTimbradoBytes = new Uint8Array(await fileData.arrayBuffer());
            const ext = papelTimbradoPath.toLowerCase().split('.').pop() || '';
            if (ext === 'pdf') papelTimbradoType = 'pdf';
            else if (ext === 'png') papelTimbradoType = 'png';
            else if (['jpg', 'jpeg', 'webp'].includes(ext)) papelTimbradoType = 'jpg';
            console.log(`[PDF] Papel timbrado carregado: ${papelTimbradoType}, ${papelTimbradoBytes.length} bytes`);
          } else {
            console.warn(`[PDF] Erro ao baixar timbrado:`, fileError);
          }
        } catch (e) {
          console.error('[PDF] Erro ao buscar papel timbrado:', e);
        }
      }

      // Generate PDF
      console.log('[PDF] Gerando PDF da proposta...');
      const pdfBytes = await generatePropostaPdf({
        empresaNome,
        empresaCnpj,
        empresaEmail,
        empresaTelefone,
        empresaEndereco,
        empresaRazaoSocial,
        licitacaoNumero,
        licitacaoOrgao,
        licitacaoObjeto,
        valorProposta,
        papelTimbradoBytes,
        papelTimbradoType,
      });

      // Convert to base64 for email attachment
      const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
      const pdfFilename = `Proposta_${licitacaoNumero.replace(/[^a-zA-Z0-9-]/g, '_')}_${empresaNome.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`;

      console.log(`[PDF] ✅ PDF gerado: ${pdfFilename} (${pdfBytes.length} bytes)`);

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

      // ── Send via Resend with PDF attachment ──
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        try {
          const fromEmail = empresaEmail
            ? `${empresaNome} <${empresaEmail}>`
            : `${empresaNome} <propostas@resend.dev>`;

          const emailBody: Record<string, unknown> = {
            from: fromEmail,
            to: [emailDestino],
            subject: assunto,
            html: htmlProposta,
            reply_to: empresaEmail || undefined,
            attachments: [{
              filename: pdfFilename,
              content: pdfBase64,
              type: 'application/pdf',
            }],
          };

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailBody),
          });

          if (emailResponse.ok) {
            const result = await emailResponse.json();
            console.log(`[Proposta] ✅ Email + PDF enviado via Resend: ${result.id}`);
            enviado = true;
            metodo = 'resend_com_pdf';
          } else {
            const err = await emailResponse.text();
            console.error(`[Proposta] Erro Resend: ${err}`);
          }
        } catch (err) {
          console.error(`[Proposta] Erro envio Resend:`, err);
        }
      }

      if (!enviado) {
        console.log(`[Proposta] ⚠️ Nenhum serviço de email configurado - PDF gerado mas não enviado`);
        metodo = 'pdf_only';
      }

      // Audit log
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
          pdf_gerado: true,
          pdf_tamanho: pdfBytes.length,
          com_papel_timbrado: !!papelTimbradoBytes,
          enviado,
        },
      });

      return new Response(JSON.stringify({
        success: enviado,
        method: metodo,
        pdf_generated: true,
        pdf_size_bytes: pdfBytes.length,
        com_papel_timbrado: !!papelTimbradoBytes,
        message: enviado
          ? `Proposta com PDF enviada para ${emailDestino}`
          : 'PDF gerado com sucesso (configure RESEND_API_KEY para enviar por email)',
        dados: {
          destinatario: emailDestino,
          assunto,
          empresa: empresaNome,
          valor: formatCurrency(valorProposta),
          pdf_filename: pdfFilename,
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
// ═══ TEMPLATE: PROPOSTA COMERCIAL (EMAIL HTML) ═══
// ═══════════════════════════════════════════════════
interface PropostaEmailData {
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

function generatePropostaEmailHtml(d: PropostaEmailData): string {
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
<tr><td style="background:#1e293b;padding:28px 32px;">
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${escapeHtml(d.empresaNome)}</h1>
  ${cnpjFormatado ? `<p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">CNPJ: ${escapeHtml(cnpjFormatado)}</p>` : ''}
</td></tr>
<tr><td style="padding:28px 32px 0;">
  <h2 style="margin:0;color:#1e293b;font-size:20px;font-weight:600;border-bottom:2px solid #3b82f6;padding-bottom:12px;">📄 PROPOSTA COMERCIAL</h2>
  <p style="margin:12px 0 0;color:#64748b;font-size:14px;">Data: ${hoje}</p>
  <p style="margin:8px 0 0;color:#3b82f6;font-size:13px;font-weight:600;">📎 PDF da proposta em anexo</p>
</td></tr>
<tr><td style="padding:24px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:600;">Referência</p>
      <p style="margin:4px 0 0;color:#1e293b;font-size:15px;font-weight:600;">${escapeHtml(d.licitacaoNumero)}</p>
    </td></tr>
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:600;">Órgão</p>
      <p style="margin:4px 0 0;color:#1e293b;font-size:15px;">${escapeHtml(d.licitacaoOrgao)}</p>
    </td></tr>
    <tr><td style="padding:16px 20px;">
      <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:600;">Objeto</p>
      <p style="margin:4px 0 0;color:#1e293b;font-size:14px;line-height:1.5;">${escapeHtml(d.licitacaoObjeto.substring(0, 500))}</p>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 32px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:8px;">
    <tr><td style="padding:24px;text-align:center;">
      <p style="margin:0;color:#bfdbfe;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Valor Global da Proposta</p>
      <p style="margin:8px 0 0;color:#ffffff;font-size:32px;font-weight:700;">${escapeHtml(valor)}</p>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 32px 24px;">
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;">
    <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
      <strong>✅ Declarações:</strong><br>
      • Todos os custos inclusos nos preços apresentados.<br>
      • Validade: 60 dias corridos.<br>
      • <strong>Proposta completa em PDF anexo.</strong>
    </p>
  </div>
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0;color:#94a3b8;font-size:11px;">Proposta gerada eletronicamente em ${hoje} • ${escapeHtml(d.empresaNome)}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
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
      .map(([key, value]) => `<tr><td style="padding:12px 16px;color:#9ca3af;font-size:14px;border-bottom:1px solid #374151;">${escapeHtml(String(key).substring(0, 50))}</td><td style="padding:12px 16px;color:#f9fafb;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid #374151;">${escapeHtml(String(value).substring(0, 200))}</td></tr>`).join('');
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
    <p style="margin:0;color:#6b7280;font-size:12px;">LicitaIA - Lei 14.133/2021</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
