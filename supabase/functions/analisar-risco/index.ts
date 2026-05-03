// Análise de risco de edital — espelha /api/analisar do server local
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const texto = JSON.stringify(body || {}).toLowerCase();

    const riscos: string[] = [];
    if (texto.includes('atestado')) riscos.push('Exige atestado técnico');
    if (texto.includes('lote')) riscos.push('Verificar lote fechado');
    if (texto.includes('entrega parcelada') || texto.includes('srp'))
      riscos.push('Pode ter entrega sob demanda/SRP');
    if (texto.includes('marca')) riscos.push('Atenção para marca/modelo de referência');
    if (texto.includes('visita técnica')) riscos.push('Exige visita técnica');
    if (texto.includes('garantia')) riscos.push('Exige garantia contratual');
    if (texto.includes('caução')) riscos.push('Exige caução');
    if (texto.includes('consórcio')) riscos.push('Permite/exige consórcio');

    const decisao =
      riscos.length >= 3 ? 'NÃO RECOMENDADO'
      : riscos.length >= 2 ? 'ANALISAR COM CUIDADO'
      : 'POTENCIALMENTE VIÁVEL';

    return new Response(JSON.stringify({
      status: 'analisado',
      decisao,
      riscos,
      total_riscos: riscos.length,
      regra: 'motor heurístico v1',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ status: 'erro', erro: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
