import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, Database } from '@/integrations/supabase/types';

export type Licitacao = Tables<'licitacoes'>;
export type AnaliseEdital = Tables<'analise_editais'>;
type LicitacaoStatus = Database['public']['Enums']['licitacao_status'];
type PortalType = Database['public']['Enums']['portal_type'];
type SegmentoType = Database['public']['Enums']['segmento_type'];

export function useLicitacoes(filters?: {
  status?: LicitacaoStatus[];
  portal?: PortalType[];
  segmento?: SegmentoType[];
  uf?: string[];
  valorMin?: number;
  valorMax?: number;
  busca?: string;
}) {
  return useQuery({
    queryKey: ['licitacoes', filters],
    queryFn: async () => {
      let query = supabase
        .from('licitacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.portal?.length) {
        query = query.in('portal', filters.portal);
      }
      if (filters?.segmento?.length) {
        query = query.in('segmento', filters.segmento);
      }
      if (filters?.uf?.length) {
        query = query.in('uf', filters.uf);
      }
      if (filters?.valorMin) {
        query = query.gte('valor', filters.valorMin);
      }
      if (filters?.valorMax) {
        query = query.lte('valor', filters.valorMax);
      }
      if (filters?.busca) {
        query = query.or(`objeto.ilike.%${filters.busca}%,orgao.ilike.%${filters.busca}%,municipio.ilike.%${filters.busca}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useLicitacao(id: string) {
  return useQuery({
    queryKey: ['licitacao', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useAnaliseEdital(licitacaoId: string) {
  return useQuery({
    queryKey: ['analise-edital', licitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analise_editais')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!licitacaoId,
  });
}

export function useCapturarPNCP() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Get current user session token for proper authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Não autenticado. Faça login para continuar.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capturar-pncp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha na captura');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
      toast({
        title: 'Captura concluída',
        description: `${data.inserted || data.count || 0} novas licitações capturadas`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na captura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAnalisarEdital() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { licitacao_id: string; objeto: string; edital_url?: string }) => {
      // Get current user session token for proper authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Não autenticado. Faça login para continuar.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisar-edital`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha na análise');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['analise-edital', data.licitacao_id] });
      toast({
        title: 'Análise concluída',
        description: `Edital analisado com sucesso (${data.source === 'ai' ? 'IA' : 'regras'})`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na análise',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLicitacaoStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('licitacoes')
        .update({ status: status as any })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMetricas() {
  return useQuery({
    queryKey: ['metricas'],
    queryFn: async () => {
      const { data: licitacoes, error } = await supabase
        .from('licitacoes')
        .select('status, valor, segmento');
      
      if (error) throw error;

      const total = licitacoes?.length || 0;
      const novas = licitacoes?.filter(l => l.status === 'Nova').length || 0;
      const aguardando = licitacoes?.filter(l => l.status === 'Aguardando Autorização').length || 0;
      const emDisputa = licitacoes?.filter(l => l.status === 'Em Disputa').length || 0;
      const vencidas = licitacoes?.filter(l => l.status === 'Vencida').length || 0;
      const perdidas = licitacoes?.filter(l => l.status === 'Perdida').length || 0;
      const valorTotal = licitacoes?.filter(l => l.status === 'Vencida').reduce((acc, l) => acc + (l.valor || 0), 0) || 0;
      
      const taxaVitoria = (vencidas + perdidas) > 0 
        ? Math.round((vencidas / (vencidas + perdidas)) * 100) 
        : 0;

      return {
        total,
        novas,
        aguardando,
        emDisputa,
        vencidas,
        valorTotal,
        taxaVitoria,
      };
    },
    refetchInterval: 30000,
  });
}

export function useLicitacoesRealtime() {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  const setupRealtime = () => {
    const channel = supabase
      .channel('licitacoes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'licitacoes',
        },
        (payload) => {
          console.log('[Realtime] Licitacao change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
          queryClient.invalidateQueries({ queryKey: ['metricas'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { setupRealtime };
}
