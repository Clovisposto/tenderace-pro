import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('[SICAF Daily] Iniciando atualização diária de todas as empresas');

  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('id, cnpj, nome');

  if (error) {
    console.error('[SICAF Daily] Erro ao buscar empresas:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ empresa: string; cnpj: string; status: string; error?: string }> = [];

  for (const empresa of empresas || []) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/verificar-sicaf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ cnpj: empresa.cnpj, empresaId: empresa.id }),
      });
      const json = await resp.json();
      const status = json?.data?.eligibility?.status || 'Erro';
      results.push({ empresa: empresa.nome, cnpj: empresa.cnpj, status });
      console.log(`[SICAF Daily] ${empresa.nome}: ${status}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      results.push({ empresa: empresa.nome, cnpj: empresa.cnpj, status: 'Erro', error: msg });
      console.error(`[SICAF Daily] Erro em ${empresa.nome}:`, msg);
    }
  }

  console.log(`[SICAF Daily] Concluído. ${results.length} empresas processadas.`);

  return new Response(JSON.stringify({
    success: true,
    processadas: results.length,
    resultados: results,
    executadoEm: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
