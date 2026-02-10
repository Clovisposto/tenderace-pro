import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Licitacao } from './useLicitacoes';

interface RealtimeNotificationOptions {
  enableSound?: boolean;
  enableToast?: boolean;
  enableVoice?: boolean;
  segmentoFilter?: 'Medicamentos' | 'Empreendimentos';
}

export function useLicitacoesRealtimeNotifications(options: RealtimeNotificationOptions = {}) {
  const { enableSound = true, enableToast = true, enableVoice = true, segmentoFilter } = options;
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedRef = useRef<Set<string>>(new Set());
  const voiceQueueRef = useRef<string[]>([]);
  const isNarratingRef = useRef(false);
  const todayCapturesRef = useRef(0);

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

  // Voice narration using browser TTS
  const narrateText = useCallback((text: string) => {
    if (!enableVoice || !('speechSynthesis' in window)) return;
    const voiceEnabled = localStorage.getItem('voiceAlertsEnabled') !== 'false';
    if (!voiceEnabled) return;
    
    voiceQueueRef.current.push(text);
    if (isNarratingRef.current) return;
    
    const processQueue = () => {
      const next = voiceQueueRef.current.shift();
      if (!next) { isNarratingRef.current = false; return; }
      isNarratingRef.current = true;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(next);
      u.lang = 'pt-BR';
      u.rate = 1.05;
      u.onend = () => setTimeout(processQueue, 300);
      u.onerror = () => setTimeout(processQueue, 300);
      window.speechSynthesis.speak(u);
    };
    processQueue();
  }, [enableVoice]);

  const showNotification = useCallback((licitacao: Partial<Licitacao>) => {
    const valorFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(licitacao.valor || 0);

    const isHighValue = (licitacao.valor || 0) > 15000;
    const isMedicamentos = licitacao.segmento === 'Medicamentos';

    // Play sound for new high-value or relevant tenders
    if (isHighValue || isMedicamentos) {
      playNotificationSound();
    }

    if (enableToast) {
      toast.success(
        `🆕 Nova Licitação Capturada!`,
        {
          description: `${licitacao.orgao?.substring(0, 40)}... - ${valorFormatted}`,
          duration: 5000,
          action: {
            label: 'Ver',
            onClick: () => {
              // Could navigate to the tender details
              console.log('View tender:', licitacao.id);
            }
          }
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

    // Voice narration for high-value or medication tenders
    todayCapturesRef.current++;
    if (isHighValue || isMedicamentos) {
      narrateText(`Nova licitação capturada. ${licitacao.segmento}, ${licitacao.municipio}, ${licitacao.uf}, valor ${valorFormatted}.`);
    }
  }, [enableToast, playNotificationSound, narrateText]);

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
              narrateText(`Parabéns! Vitória na licitação ${updatedLicitacao.numero}. ${updatedLicitacao.objeto_resumido || ''}`);
            } else if (updatedLicitacao.status === 'Em Disputa') {
              toast.info('⚡ Disputa Iniciada', {
                description: `${updatedLicitacao.numero} - Acompanhe em tempo real`,
                duration: 5000,
              });
              narrateText(`Atenção! Disputa iniciada na licitação ${updatedLicitacao.numero}.`);
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
  }, [queryClient, segmentoFilter, showNotification, playNotificationSound, narrateText]);

  // Voice summary of today's captures
  const narrateVoiceSummary = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayData, count: todayCount } = await supabase
        .from('licitacoes')
        .select('segmento, valor, uf, municipio, orgao, portal', { count: 'exact' })
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      const { count: novas } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('status', 'Nova');
      const { count: disputas } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('status', 'Em Disputa');
      const { count: vencidas } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('status', 'Vencida');
      const { count: aguardando } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('status', 'Aguardando Autorização');

      const totalValorHoje = todayData?.reduce((sum, l) => sum + Number(l.valor), 0) || 0;
      const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValorHoje);
      
      // Count by portal
      const portalCounts: Record<string, number> = {};
      todayData?.forEach(l => {
        portalCounts[l.portal] = (portalCounts[l.portal] || 0) + 1;
      });
      const portalSummary = Object.entries(portalCounts).map(([p, c]) => `${p}: ${c}`).join(', ');

      const summary = `Resumo do dia. Hoje foram capturadas ${todayCount || 0} licitações, totalizando ${valorFormatted}. ` +
        `Portais: ${portalSummary || 'nenhum'}. ` +
        `Status geral: ${novas || 0} novas, ${aguardando || 0} aguardando autorização, ${disputas || 0} em disputa, ${vencidas || 0} vencidas. ` +
        `${(aguardando || 0) > 0 ? 'Atenção: há licitações esperando sua autorização!' : 'Tudo em dia.'}`;

      narrateText(summary);
      return summary;
    } catch {
      const fallback = 'Não consegui gerar o resumo por voz no momento.';
      narrateText(fallback);
      return fallback;
    }
  }, [narrateText]);

  return {
    playNotificationSound,
    showNotification,
    narrateVoiceSummary,
    todayCaptures: todayCapturesRef.current,
  };
}
