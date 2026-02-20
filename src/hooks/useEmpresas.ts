import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { getSafeErrorMessage } from '@/lib/safeError';

export type Empresa = Tables<'empresas'>;
export type EmpresaInsert = TablesInsert<'empresas'>;

export function useEmpresas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['empresas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useEmpresa(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['empresa', id, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });
}

export function useCreateEmpresa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (empresa: Omit<EmpresaInsert, 'user_id'>) => {
      if (!user) throw new Error('User not authenticated');

      // Check if CNPJ already exists for this user before inserting
      const cnpj = empresa.cnpj.replace(/\D/g, '');
      const { data: existing } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('user_id', user.id)
        .ilike('cnpj', `%${cnpj.slice(-8)}%`)
        .maybeSingle();

      if (existing) {
        throw Object.assign(new Error('CNPJ_DUPLICADO'), {
          nomeDuplicado: existing.nome,
        });
      }

      const { data, error } = await supabase
        .from('empresas')
        .insert({ ...empresa, user_id: user.id })
        .select()
        .single();

      if (error) {
        // Postgres unique violation code
        if (error.code === '23505' && error.message.includes('cnpj')) {
          throw Object.assign(new Error('CNPJ_DUPLICADO'), {});
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({
        title: 'Empresa cadastrada',
        description: 'Empresa adicionada com sucesso ao sistema.',
      });
    },
    onError: (error: any) => {
      if (error?.message === 'CNPJ_DUPLICADO') {
        toast({
          title: 'CNPJ já cadastrado',
          description: error?.nomeDuplicado
            ? `O CNPJ informado já está vinculado à empresa "${error.nomeDuplicado}". Use o botão Editar para atualizar os dados.`
            : 'Este CNPJ já está cadastrado na sua conta. Use o botão Editar para atualizar os dados.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Erro ao cadastrar',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEmpresa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Empresa> & { id: string }) => {
      const { data, error } = await supabase
        .from('empresas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({
        title: 'Empresa atualizada',
        description: 'Dados atualizados com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEmpresa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({
        title: 'Empresa removida',
        description: 'Empresa excluída do sistema.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useComplianceEmpresa(empresaId: string, licitacaoId: string) {
  return useQuery({
    queryKey: ['compliance', empresaId, licitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_empresas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('licitacao_id', licitacaoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && !!licitacaoId,
  });
}
