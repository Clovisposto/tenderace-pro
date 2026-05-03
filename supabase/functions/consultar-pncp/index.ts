// Consulta direta à API pública do PNCP — espelha /api/pncp do server local
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const modalidade = url.searchParams.get('modalidade') ?? '6';
    const dias = parseInt(url.searchParams.get('dias') ?? '30', 10);
    const pagina = url.searchParams.get('pagina') ?? '1';
    const tamanho = url.searchParams.get('tamanho') ?? '20';

    const hoje = new Date();
    const fim = hoje.toISOString().slice(0, 10).replaceAll('-', '');
    const ini = new Date(hoje.getTime() - dias * 86400000)
      .toISOString().slice(0, 10).replaceAll('-', '');

    const pncpUrl = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${ini}&dataFinal=${fim}&codigoModalidadeContratacao=${modalidade}&pagina=${pagina}&tamanhoPagina=${tamanho}`;

    const ctrl = AbortController ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), 20000) : null;

    const r = await fetch(pncpUrl, { signal: ctrl?.signal });
    if (t) clearTimeout(t);

    if (!r.ok) throw new Error(`PNCP HTTP ${r.status}`);
    const json = await r.json();

    return new Response(JSON.stringify({
      status: 'ok',
      fonte: 'PNCP OFICIAL',
      total: json?.totalRegistros ?? null,
      pagina: Number(pagina),
      dados: json?.data ?? [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ status: 'erro', erro: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
