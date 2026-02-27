import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface PdfData {
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
  papelTimbradoType: string | null;
}

async function generatePropostaPdf(d: PdfData): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  let startY = 720;

  if (d.papelTimbradoBytes && d.papelTimbradoType === 'pdf') {
    try {
      const letterheadDoc = await PDFDocument.load(d.papelTimbradoBytes);
      pdfDoc = await PDFDocument.create();
      const [copiedPage] = await pdfDoc.copyPages(letterheadDoc, [0]);
      pdfDoc.addPage(copiedPage);
      startY = copiedPage.getHeight() - 160;
    } catch {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]);
    }
  } else {
    pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);

    if (d.papelTimbradoBytes && d.papelTimbradoType) {
      try {
        const img = d.papelTimbradoType === 'png'
          ? await pdfDoc.embedPng(d.papelTimbradoBytes)
          : await pdfDoc.embedJpg(d.papelTimbradoBytes);
        const { width, height } = page.getSize();
        page.drawImage(img, { x: 0, y: 0, width, height });
        startY = height - 160;
      } catch (e) {
        console.error('[PDF] Erro ao embedar imagem:', e);
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

  const darkBlue = rgb(0.118, 0.161, 0.231);
  const gray = rgb(0.396, 0.455, 0.525);
  const blue = rgb(0.231, 0.51, 0.965);
  const black = rgb(0, 0, 0);

  if (!d.papelTimbradoBytes) {
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

  page.drawText('PROPOSTA COMERCIAL', { x: marginLeft, y, size: 16, font: fontBold, color: darkBlue });
  y -= 5;
  page.drawRectangle({ x: marginLeft, y, width: 200, height: 2, color: blue });
  y -= 20;
  page.drawText(`Data: ${hoje}`, { x: marginLeft, y, size: 10, font: fontRegular, color: gray });
  y -= 30;

  page.drawText('DADOS DA LICITAÇÃO', { x: marginLeft, y, size: 11, font: fontBold, color: darkBlue });
  y -= 4;
  page.drawRectangle({ x: marginLeft, y, width: contentWidth, height: 1, color: rgb(0.88, 0.91, 0.94) });
  y -= 18;

  for (const f of [
    { label: 'Número/Referência:', value: d.licitacaoNumero },
    { label: 'Órgão:', value: d.licitacaoOrgao },
  ]) {
    page.drawText(f.label, { x: marginLeft, y, size: 10, font: fontBold, color: gray });
    page.drawText(f.value, { x: marginLeft + 120, y, size: 10, font: fontRegular, color: black });
    y -= 16;
  }

  page.drawText('Objeto:', { x: marginLeft, y, size: 10, font: fontBold, color: gray });
  y -= 14;
  for (const line of wrapText(d.licitacaoObjeto.substring(0, 600), 80)) {
    page.drawText(line, { x: marginLeft + 10, y, size: 9, font: fontRegular, color: black });
    y -= 13;
  }
  y -= 10;

  const boxH = 55;
  page.drawRectangle({ x: marginLeft, y: y - boxH + 20, width: contentWidth, height: boxH, color: rgb(0.118, 0.251, 0.686) });
  page.drawText('VALOR GLOBAL DA PROPOSTA', { x: marginLeft + 20, y: y + 2, size: 10, font: fontBold, color: rgb(0.75, 0.86, 0.99) });
  page.drawText(valor, { x: marginLeft + 20, y: y - 20, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  y -= boxH + 15;

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

  page.drawText('DECLARAÇÕES', { x: marginLeft, y, size: 11, font: fontBold, color: darkBlue });
  y -= 4;
  page.drawRectangle({ x: marginLeft, y, width: contentWidth, height: 1, color: rgb(0.88, 0.91, 0.94) });
  y -= 16;

  for (const decl of [
    'Nos preços apresentados estão incluídos todos os custos diretos e indiretos, tributos, encargos sociais e trabalhistas, fretes e quaisquer outros custos e despesas.',
    'Os dados do responsável legal da empresa e demais condições estão disponíveis mediante solicitação.',
    'A validade desta proposta é de 60 (sessenta) dias corridos, contados da data de sua apresentação.',
    'Declaramos, sob as penas da lei, que cumprimos plenamente os requisitos de habilitação conforme Lei nº 14.133/2021.',
  ]) {
    for (const line of wrapText(`• ${decl}`, 85)) {
      if (y < 60) break;
      page.drawText(line, { x: marginLeft + 5, y, size: 9, font: fontRegular, color: gray });
      y -= 12;
    }
    y -= 4;
  }

  if (y > 80) {
    y = Math.max(y - 20, 50);
    page.drawText(`Proposta gerada eletronicamente em ${hoje}`, { x: marginLeft, y, size: 8, font: fontRegular, color: rgb(0.6, 0.65, 0.7) });
    page.drawText(`${d.empresaNome} • ${cnpjFormatado}`, { x: marginLeft, y: y - 12, size: 8, font: fontRegular, color: rgb(0.6, 0.65, 0.7) });
  }

  return await pdfDoc.save();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposta_id, licitacao_id, empresa_id } = await req.json();

    if (!licitacao_id || !empresa_id) {
      return new Response(JSON.stringify({ error: 'licitacao_id e empresa_id são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch licitacao
    const { data: licitacao, error: licErr } = await supabase
      .from('licitacoes')
      .select('numero, orgao, objeto, valor, modalidade')
      .eq('id', licitacao_id)
      .single();

    if (licErr || !licitacao) {
      return new Response(JSON.stringify({ error: 'Licitação não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch empresa
    const { data: empresa, error: empErr } = await supabase
      .from('empresas')
      .select('nome, cnpj, razao_social, email, telefone, endereco, papel_timbrado_url')
      .eq('id', empresa_id)
      .single();

    if (empErr || !empresa) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch proposta value
    let valorProposta = licitacao.valor;
    if (proposta_id) {
      const { data: proposta } = await supabase
        .from('propostas')
        .select('valor_proposta')
        .eq('id', proposta_id)
        .single();
      if (proposta) valorProposta = proposta.valor_proposta;
    }

    // Fetch letterhead
    let papelTimbradoBytes: Uint8Array | null = null;
    let papelTimbradoType: string | null = null;

    if (empresa.papel_timbrado_url) {
      try {
        const { data: fileData } = await supabase.storage
          .from('papeis-timbrados')
          .download(empresa.papel_timbrado_url);

        if (fileData) {
          papelTimbradoBytes = new Uint8Array(await fileData.arrayBuffer());
          const ext = empresa.papel_timbrado_url.toLowerCase().split('.').pop() || '';
          if (ext === 'pdf') papelTimbradoType = 'pdf';
          else if (ext === 'png') papelTimbradoType = 'png';
          else papelTimbradoType = 'jpg';
        }
      } catch (e) {
        console.error('[PDF] Erro timbrado:', e);
      }
    }

    // Generate PDF
    const pdfBytes = await generatePropostaPdf({
      empresaNome: empresa.nome,
      empresaCnpj: empresa.cnpj,
      empresaEmail: empresa.email,
      empresaTelefone: empresa.telefone,
      empresaEndereco: empresa.endereco,
      empresaRazaoSocial: empresa.razao_social,
      licitacaoNumero: licitacao.numero,
      licitacaoOrgao: licitacao.orgao,
      licitacaoObjeto: licitacao.objeto,
      valorProposta,
      papelTimbradoBytes,
      papelTimbradoType,
    });

    // Return as base64 JSON (for preview in iframe) or as binary
    const accept = req.headers.get('accept') || '';
    if (accept.includes('application/pdf')) {
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="Proposta_${licitacao.numero.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf"`,
        },
      });
    }

    // Default: return base64
    const base64 = btoa(String.fromCharCode(...pdfBytes));
    return new Response(JSON.stringify({
      success: true,
      pdf_base64: base64,
      filename: `Proposta_${licitacao.numero.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`,
      size_bytes: pdfBytes.length,
      com_papel_timbrado: !!papelTimbradoBytes,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[gerar-proposta-pdf] Erro:', error);
    return new Response(JSON.stringify({ error: 'Erro ao gerar PDF' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
