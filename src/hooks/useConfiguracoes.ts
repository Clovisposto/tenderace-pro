import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';
import type { Json } from '@/integrations/supabase/types';

export type Configuracao = Tables<'configuracoes'>;

// Tipo para municípios priorizados: { "PA": ["Belém", "Santarém"], "GO": ["Goiânia"] }
export type MunicipiosPriorizados = Record<string, string[]>;

export function useConfiguracoes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['configuracoes', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return default config if none exists
      if (!data) {
        return {
          valor_minimo: 1000,
          valor_maximo: 35000,
          margem_minima: 8,
          lance_automatico: true,
          notificacoes_email: true,
          notificacoes_push: true,
          notificacoes_telefone: false,
          telefone_notificacao: '',
          notificacoes_vitoria: true,
          notificacoes_derrota: true,
          notificacoes_nova_licitacao: true,
          notificacoes_prazo_urgente: true,
          notificacoes_disputa: true,
          som_notificacao: true,
          captacao_continua: true,
          prioridade_interior: true,
          ufs_priorizadas: [],
          municipios_priorizados: {} as MunicipiosPriorizados,
          tipos_licitacao: ['compra', 'servico'] as string[],
          modalidades_permitidas: ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'] as string[],
        } as Partial<Configuracao> & { 
          municipios_priorizados: MunicipiosPriorizados; 
          tipos_licitacao: string[];
          modalidades_permitidas: string[];
          notificacoes_telefone: boolean;
          telefone_notificacao: string;
          notificacoes_vitoria: boolean;
          notificacoes_derrota: boolean;
          notificacoes_nova_licitacao: boolean;
          notificacoes_prazo_urgente: boolean;
          notificacoes_disputa: boolean;
          som_notificacao: boolean;
        };
      }
      
      return {
        ...data,
        municipios_priorizados: (data as any).municipios_priorizados as MunicipiosPriorizados || {},
        tipos_licitacao: (data as any).tipos_licitacao as string[] || ['compra', 'servico'],
        modalidades_permitidas: (data as any).modalidades_permitidas as string[] || ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'],
      };
    },
    enabled: !!user,
  });
}

export function useUpdateConfiguracoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (config: Partial<{
      valor_minimo: number | null;
      valor_maximo: number | null;
      margem_minima: number | null;
      lance_automatico: boolean | null;
      notificacoes_email: boolean | null;
      notificacoes_push: boolean | null;
      notificacoes_telefone: boolean | null;
      telefone_notificacao: string | null;
      notificacoes_vitoria: boolean | null;
      notificacoes_derrota: boolean | null;
      notificacoes_nova_licitacao: boolean | null;
      notificacoes_prazo_urgente: boolean | null;
      notificacoes_disputa: boolean | null;
      som_notificacao: boolean | null;
      captacao_continua: boolean | null;
      prioridade_interior: boolean | null;
      ufs_priorizadas: string[] | null;
      municipios_priorizados: MunicipiosPriorizados;
      tipos_licitacao: string[] | null;
      modalidades_permitidas: string[] | null;
    }>) => {
      if (!user) throw new Error('User not authenticated');

      // Check if config exists
      const { data: existing } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('configuracoes')
          .update(config as any)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('configuracoes')
          .insert({ ...config, user_id: user.id } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      toast({
        title: 'Configurações salvas',
        description: 'Suas preferências foram atualizadas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
