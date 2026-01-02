import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export type Configuracao = Tables<'configuracoes'>;

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
          captacao_continua: true,
          prioridade_interior: true,
          ufs_priorizadas: [],
        } as Partial<Configuracao>;
      }
      
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateConfiguracoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (config: TablesUpdate<'configuracoes'>) => {
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
          .update(config)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('configuracoes')
          .insert({ ...config, user_id: user.id })
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
