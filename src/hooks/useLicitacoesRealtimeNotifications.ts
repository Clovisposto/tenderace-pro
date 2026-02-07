import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Licitacao } from './useLicitacoes';

interface RealtimeNotificationOptions {
  enableSound?: boolean;
  enableToast?: boolean;
  segmentoFilter?: 'Medicamentos' | 'Empreendimentos';
}

export function useLicitacoesRealtimeNotifications(options: RealtimeNotificationOptions = {}) {
  const { enableSound = true, enableToast = true, segmentoFilter } = options;
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  // Create audio element for notification sound
  useEffect(() => {
    if (enableSound) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1cZ35/fHl2eHx8eXd5fH59e3l6fX9/fXt7foCBf318foCCgYB+foCBgoGAf4CBgoKBgIGBgoKCgYGBgoKCgoKCgoKCgoKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4SEhISEhISEhISEhIODg4ODg4ODg4OCgoKCgoKCgYGBgYGBgYCAgIB/f39/fn5+fn19fXx8fHt7e3p6enl5eXh4eHd3d3Z2dnV1dXR0dHNzc3JycnFxcXBwcG9vb25ubm1tbWxsbGtra2pqamlpaWhnaGdmZmVlZWRkY2NjYmJhYWFgYF9fX15eXV1dXFxbW1taWllZWVhYV1dXVlZVVVVUVFNTU1JSUVFRUFBPTk5OTU1MTEtLS0pKSUlJSEhHR0dGRkVFRURERENDQkJCQUFAQEA/Pz4+PT09PDw7Ozs6Ojk5OTg4Nzc3NjY1NTQ0NDMzMjIxMTExMDAvLy8uLi0tLSwsKysrKiopKSkpKCgoJycnJiYmJSUkJCQjIyMiIiEhISAgHx8fHh4dHR0cHBsbGxoaGRkZGBgYFxcXFhYWFRUUFBQTExMSEhISEREREBAPDw8ODg4NDQ0MDAwLCwsKCgoJCQkICAgHBwcGBgYFBQUEBAQDAwMCAgIBAQEBAAAAAAAAAAABAgIDAwQEBQUGBgcHCAkJCgsLDA0NDg8PEBERERITMTM1Nzk7PT9BQ0ZIS01PUlRWWFtdYGJlZ2psb3F0dnh7foCDhYiKjY+SlZeam52goqWoqqyvsrS2ubu9v8HEx8jKzM7Q0tTW2Nrc3uDi5Obo6uzu8PL09vj6/P4=');
    }
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [enableSound]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && enableSound) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [enableSound]);

  const showNotification = useCallback((licitacao: Partial<Licitacao>) => {
    const valorFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(licitacao.valor || 0);

    const isHighValue = (licitacao.valor || 0) > 15000;
    const isMedicamentos = licitacao.segmento === 'Medicamentos';

    // Play sound only for high-value or relevant tenders
    if (isHighValue || isMedicamentos) {
      playNotificationSound();
    }

    // Batch notifications: only show toast if last one was > 3s ago
    const now = Date.now();
    const lastToastTime = (window as any).__lastCaptureToast || 0;
    if (enableToast && now - lastToastTime > 3000) {
      (window as any).__lastCaptureToast = now;
      toast.success(
        `🆕 Nova Licitação Capturada!`,
        {
          description: `${licitacao.orgao?.substring(0, 40)} - ${valorFormatted}`,
          duration: 3000,
        }
      );
    }

    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nova Licitação Capturada', {
        body: `${licitacao.segmento} - ${valorFormatted}\n${licitacao.municipio}/${licitacao.uf}`,
        icon: '/favicon.ico',
        tag: licitacao.id,
      });
    }
  }, [enableToast, playNotificationSound]);

  // Set up realtime subscription with notifications
  useEffect(() => {
    console.log('[Realtime] Setting up notifications subscription...');
    
    const channel = supabase
      .channel('licitacoes-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'licitacoes',
        },
        (payload) => {
          const newLicitacao = payload.new as Licitacao;
          console.log('[Realtime] Nova licitação detectada:', newLicitacao.numero);
          
          // Check if already notified (avoid duplicates)
          if (lastNotifiedRef.current.has(newLicitacao.id)) {
            return;
          }
          
          // Apply segment filter if specified
          if (segmentoFilter && newLicitacao.segmento !== segmentoFilter) {
            console.log('[Realtime] Licitação filtrada por segmento:', newLicitacao.segmento);
            return;
          }
          
          // Mark as notified
          lastNotifiedRef.current.add(newLicitacao.id);
          
          // Keep set size manageable
          if (lastNotifiedRef.current.size > 100) {
            const arr = Array.from(lastNotifiedRef.current);
            lastNotifiedRef.current = new Set(arr.slice(-50));
          }
          
          // Show notification
          showNotification(newLicitacao);
          
          // Invalidate queries to refresh the list
          queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
          queryClient.invalidateQueries({ queryKey: ['metricas'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'licitacoes',
        },
        (payload) => {
          const updatedLicitacao = payload.new as Licitacao;
          const oldLicitacao = payload.old as Partial<Licitacao>;
          
          // Notify on status changes
          if (oldLicitacao.status !== updatedLicitacao.status) {
            console.log('[Realtime] Status alterado:', oldLicitacao.status, '->', updatedLicitacao.status);
            
            if (updatedLicitacao.status === 'Vencida') {
              playNotificationSound();
              toast.success('🏆 Vitória!', {
                description: `Você venceu: ${updatedLicitacao.objeto_resumido}`,
                duration: 8000,
              });
            } else if (updatedLicitacao.status === 'Em Disputa') {
              toast.info('⚡ Disputa Iniciada', {
                description: `${updatedLicitacao.numero} - Acompanhe em tempo real`,
                duration: 5000,
              });
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
          queryClient.invalidateQueries({ queryKey: ['metricas'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, segmentoFilter, showNotification, playNotificationSound]);

  return {
    playNotificationSound,
    showNotification,
  };
}
