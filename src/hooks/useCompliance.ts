import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ComplianceCheck {
  documento_id: string;
  documento_nome: string;
  obrigatorio: boolean;
  status: 'valido' | 'vencido' | 'ausente' | 'pendente';
  vencimento?: string;
  observacao?: string;
}

export interface ComplianceResult {
  empresa_id: string;
  empresa_nome: string;
  status_geral: 'Apta' | 'Apta c/ Ressalva' | 'Inapta';
  verificacoes: ComplianceCheck[];
  pendencias: string[];
  score: number;
}

export function useVerificarCompliance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ empresa_id, licitacao_id }: { empresa_id: string; licitacao_id: string }) => {
      const { data, error } = await supabase.functions.invoke('verificar-compliance', {
        body: { empresa_id, licitacao_id }
      });
      
      if (error) throw error;
      return data as ComplianceResult;
    },
    onSuccess: (data) => {
      toast({
        title: 'Verificação concluída',
        description: `Status: ${data.status_geral} (Score: ${data.score}%)`,
      });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro na verificação',
        description: error.message,
        variant: 'destructive',
      });
    }
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

export function useAllCompliance(licitacaoId: string) {
  return useQuery({
    queryKey: ['compliance', 'licitacao', licitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_empresas')
        .select(`
          *,
          empresas (
            id,
            nome,
            cnpj,
            segmento
          )
        `)
        .eq('licitacao_id', licitacaoId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!licitacaoId,
  });
}