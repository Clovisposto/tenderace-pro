import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths } from 'date-fns';

interface UFMetrics {
  uf: string;
  total: number;
  vitorias: number;
  perdidas: number;
  emDisputa: number;
  taxaSucesso: number;
  valorTotal: number;
  valorVencido: number;
}

interface MunicipioMetrics {
  municipio: string;
  uf: string;
  total: number;
  vitorias: number;
  perdidas: number;
  taxaSucesso: number;
  valorTotal: number;
  valorVencido: number;
}

interface GeographicMetrics {
  ufMetrics: UFMetrics[];
  municipioMetrics: MunicipioMetrics[];
  topUFs: UFMetrics[];
  topMunicipios: MunicipioMetrics[];
  summary: {
    totalUFs: number;
    totalMunicipios: number;
    ufMaisVitorias: string;
    municipioMaisVitorias: string;
    taxaMediaNacional: number;
  };
}

export function useGeographicMetrics(periodo: string = '6m') {
  return useQuery({
    queryKey: ['geographic-metrics', periodo],
    queryFn: async (): Promise<GeographicMetrics> => {
      const now = new Date();
      let startDate: Date;
      
      switch (periodo) {
        case '1m':
          startDate = subMonths(now, 1);
          break;
        case '3m':
          startDate = subMonths(now, 3);
          break;
        case '6m':
          startDate = subMonths(now, 6);
          break;
        case '1a':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = subMonths(now, 6);
      }

      // Fetch all licitacoes within the period
      const { data: licitacoes, error } = await supabase
        .from('licitacoes')
        .select('id, uf, municipio, status, valor, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate UF metrics
      const ufMap = new Map<string, UFMetrics>();
      
      licitacoes?.forEach(lic => {
        const existing = ufMap.get(lic.uf) || {
          uf: lic.uf,
          total: 0,
          vitorias: 0,
          perdidas: 0,
          emDisputa: 0,
          taxaSucesso: 0,
          valorTotal: 0,
          valorVencido: 0,
        };
        
        existing.total++;
        existing.valorTotal += Number(lic.valor);
        
        if (lic.status === 'Vencida') {
          existing.vitorias++;
          existing.valorVencido += Number(lic.valor);
        } else if (lic.status === 'Perdida') {
          existing.perdidas++;
        } else if (lic.status === 'Em Disputa') {
          existing.emDisputa++;
        }
        
        ufMap.set(lic.uf, existing);
      });

      // Calculate success rate for each UF
      ufMap.forEach(uf => {
        const totalDecididas = uf.vitorias + uf.perdidas;
        uf.taxaSucesso = totalDecididas > 0 
          ? Math.round((uf.vitorias / totalDecididas) * 100) 
          : 0;
      });

      const ufMetrics = Array.from(ufMap.values());

      // Calculate Municipio metrics
      const municipioMap = new Map<string, MunicipioMetrics>();
      
      licitacoes?.forEach(lic => {
        const key = `${lic.municipio}-${lic.uf}`;
        const existing = municipioMap.get(key) || {
          municipio: lic.municipio,
          uf: lic.uf,
          total: 0,
          vitorias: 0,
          perdidas: 0,
          taxaSucesso: 0,
          valorTotal: 0,
          valorVencido: 0,
        };
        
        existing.total++;
        existing.valorTotal += Number(lic.valor);
        
        if (lic.status === 'Vencida') {
          existing.vitorias++;
          existing.valorVencido += Number(lic.valor);
        } else if (lic.status === 'Perdida') {
          existing.perdidas++;
        }
        
        municipioMap.set(key, existing);
      });

      // Calculate success rate for each Municipio
      municipioMap.forEach(m => {
        const totalDecididas = m.vitorias + m.perdidas;
        m.taxaSucesso = totalDecididas > 0 
          ? Math.round((m.vitorias / totalDecididas) * 100) 
          : 0;
      });

      const municipioMetrics = Array.from(municipioMap.values());

      // Sort by victories for top performers
      const topUFs = [...ufMetrics]
        .sort((a, b) => b.vitorias - a.vitorias || b.taxaSucesso - a.taxaSucesso)
        .slice(0, 10);

      const topMunicipios = [...municipioMetrics]
        .sort((a, b) => b.vitorias - a.vitorias || b.taxaSucesso - a.taxaSucesso)
        .slice(0, 10);

      // Calculate summary
      const totalVitorias = ufMetrics.reduce((acc, uf) => acc + uf.vitorias, 0);
      const totalPerdidas = ufMetrics.reduce((acc, uf) => acc + uf.perdidas, 0);
      const totalDecididas = totalVitorias + totalPerdidas;
      const taxaMediaNacional = totalDecididas > 0 
        ? Math.round((totalVitorias / totalDecididas) * 100)
        : 0;

      const ufMaisVitorias = topUFs[0]?.uf || '-';
      const municipioMaisVitorias = topMunicipios[0] 
        ? `${topMunicipios[0].municipio}/${topMunicipios[0].uf}`
        : '-';

      return {
        ufMetrics,
        municipioMetrics,
        topUFs,
        topMunicipios,
        summary: {
          totalUFs: ufMetrics.length,
          totalMunicipios: municipioMetrics.length,
          ufMaisVitorias,
          municipioMaisVitorias,
          taxaMediaNacional,
        },
      };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}
