import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LicitacaoItem {
  id: string;
  licitacao_id: string;
  numero_item: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_referencia: number | null;
  preco_robo: number | null;
  preco_manual: number | null;
  preco_final: number | null;
  modo_cotacao: 'pendente' | 'robo' | 'manual' | 'cancelado';
  robo_fontes: Array<{ loja: string; url?: string; preco: number; endereco?: string }>;
  margem_lucro: number | null;
  custo_estimado: number | null;
  observacoes: string | null;
}

export const useLicitacaoItens = (licitacaoId: string | undefined) => {
  return useQuery({
    queryKey: ['licitacao-itens', licitacaoId],
    queryFn: async () => {
      if (!licitacaoId) return [];
      const { data, error } = await supabase
        .from('licitacao_itens')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .order('numero_item');
      if (error) throw error;
      return (data || []) as unknown as LicitacaoItem[];
    },
    enabled: !!licitacaoId,
  });
};

export const useExtrairItens = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (licitacao_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extrair-itens-edital`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ licitacao_id }),
      });
      const json = await resp.json();
      if (!json.success) {
        if (json.error_code === 'AI_CREDITS_EXHAUSTED') {
          throw new Error('Créditos de IA esgotados — adicione créditos em Configurações → Workspace → Uso');
        }
        throw new Error(json.error || 'Falha ao extrair itens');
      }
      return json;
    },
    onSuccess: (data, licitacao_id) => {
      toast.success(`${data.total_itens} item(ns) extraído(s) do edital`);
      qc.invalidateQueries({ queryKey: ['licitacao-itens', licitacao_id] });
      qc.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCotarItemRobo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: LicitacaoItem) => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cotar-item-robo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ item_id: item.id }),
      });
      const json = await resp.json();
      if (!json.success) {
        if (json.error_code === 'AI_CREDITS_EXHAUSTED') throw new Error('Créditos de IA esgotados');
        throw new Error(json.error || 'Falha na cotação');
      }
      return { ...json, licitacao_id: item.licitacao_id };
    },
    onSuccess: (data) => {
      toast.success('Cotação do robô concluída');
      qc.invalidateQueries({ queryKey: ['licitacao-itens', data.licitacao_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, licitacao_id, ...patch }: Partial<LicitacaoItem> & { id: string; licitacao_id: string }) => {
      // Recalculate margem and preco_final when relevant fields change
      const updates: any = { ...patch };
      const { data: current } = await supabase.from('licitacao_itens').select('*').eq('id', id).maybeSingle();
      const merged = { ...current, ...updates };
      const ref = merged.preco_referencia;
      let custo: number | null = null;
      if (merged.modo_cotacao === 'manual') custo = merged.preco_manual;
      else if (merged.modo_cotacao === 'robo') custo = merged.preco_robo;
      if (custo != null && ref != null) updates.margem_lucro = ((ref - custo) / ref) * 100;
      if (custo != null) updates.custo_estimado = custo;
      if (merged.modo_cotacao !== 'cancelado') updates.preco_final = ref;

      const { error } = await supabase.from('licitacao_itens').update(updates).eq('id', id);
      if (error) throw error;
      return { licitacao_id };
    },
    onSuccess: ({ licitacao_id }) => {
      qc.invalidateQueries({ queryKey: ['licitacao-itens', licitacao_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
