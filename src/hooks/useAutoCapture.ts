import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PortalResult {
  portal: string;
  success: boolean;
  count: number;
  error?: string;
  retries?: number;
}

interface CaptureResponse {
  success: boolean;
  message: string;
  total: number;
  portals: PortalResult[];
  fallbackActivated: boolean;
}

export function useAutoCapture() {
  const queryClient = useQueryClient();
  const [lastCaptureResult, setLastCaptureResult] = useState<CaptureResponse | null>(null);

  const captureMutation = useMutation({
    mutationFn: async (): Promise<CaptureResponse> => {
      console.log('[AutoCapture] Starting capture...');
      
      // Get session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }

      const response = await supabase.functions.invoke('capturar-pncp', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('[AutoCapture] Error:', response.error);
        throw new Error(response.error.message || 'Erro na captura');
      }

      const data = response.data as CaptureResponse;
      console.log('[AutoCapture] Success:', data);
      
      return data;
    },
    onSuccess: (data) => {
      setLastCaptureResult(data);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });

      // Show appropriate toast based on result
      if (data.fallbackActivated) {
        toast.info(`Captura completa: ${data.total} licitações via fallback`, {
          description: 'API primária indisponível, portais alternativos utilizados'
        });
      } else if (data.total > 0) {
        toast.success(`${data.total} licitações capturadas com sucesso!`, {
          description: data.portals.map(p => `${p.portal}: +${p.count}`).join(' | ')
        });
      } else {
        toast.info('Nenhuma nova licitação encontrada');
      }
    },
    onError: (error: Error) => {
      console.error('[AutoCapture] Mutation error:', error);
      
      if (error.message.includes('401') || error.message.includes('Admin')) {
        toast.error('Acesso negado', {
          description: 'Você precisa de permissão de admin para capturar'
        });
      } else if (error.message.includes('503')) {
        toast.warning('APIs temporariamente indisponíveis', {
          description: 'Tentando novamente automaticamente...'
        });
      } else {
        toast.error('Erro na captura', {
          description: error.message
        });
      }
    },
  });

  const capture = useCallback(async () => {
    return captureMutation.mutateAsync();
  }, [captureMutation]);

  return {
    capture,
    isCapturing: captureMutation.isPending,
    lastResult: lastCaptureResult,
    error: captureMutation.error,
  };
}
