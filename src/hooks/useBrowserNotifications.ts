import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export type NotificationPermissionState = 'default' | 'granted' | 'denied';

interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
  onClick?: () => void;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermissionState);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      
      if (result === 'granted') {
        toast.success('Notificações push ativadas!');
        // Send test notification
        showNotification({
          title: 'LicitaIA — Notificações Ativas',
          body: 'Você receberá alertas mesmo com o app minimizado.',
          icon: '/favicon.ico'
        });
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão de notificações negada. Ative nas configurações do navegador.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificações');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((options: BrowserNotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available or not permitted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction ?? false,
        data: options.data,
        badge: '/favicon.ico',
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        options.onClick?.();
      };

      // Auto-close after 10 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  // Specialized notification methods
  const notifyVictory = useCallback((licitacao: { numero: string; valor: number; orgao: string }) => {
    return showNotification({
      title: '🏆 VITÓRIA! Licitação Vencida!',
      body: `${licitacao.numero} - R$ ${licitacao.valor.toLocaleString('pt-BR')} - ${licitacao.orgao}`,
      tag: `victory-${licitacao.numero}`,
      requireInteraction: true,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  const notifyNewTender = useCallback((licitacao: { numero: string; valor: number; orgao: string; prioridade?: string }) => {
    const isHighPriority = licitacao.prioridade === 'alta';
    return showNotification({
      title: isHighPriority ? '🔥 Nova Licitação ALTA PRIORIDADE!' : '📋 Nova Licitação Detectada',
      body: `${licitacao.numero} - R$ ${licitacao.valor.toLocaleString('pt-BR')} - ${licitacao.orgao}`,
      tag: `new-${licitacao.numero}`,
      requireInteraction: isHighPriority,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  const notifyDispute = useCallback((licitacao: { numero: string; posicao: number; orgao: string }) => {
    return showNotification({
      title: '⚔️ Disputa em Andamento!',
      body: `${licitacao.numero} - Posição: ${licitacao.posicao}º lugar - ${licitacao.orgao}`,
      tag: `dispute-${licitacao.numero}`,
      requireInteraction: true,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  const notifyUrgentDeadline = useCallback((licitacao: { numero: string; horasRestantes: number; orgao: string }) => {
    return showNotification({
      title: '⏰ PRAZO URGENTE!',
      body: `${licitacao.numero} - Apenas ${licitacao.horasRestantes}h restantes - ${licitacao.orgao}`,
      tag: `urgent-${licitacao.numero}`,
      requireInteraction: true,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  const notifyLoss = useCallback((licitacao: { numero: string; valor: number; orgao: string }) => {
    return showNotification({
      title: '❌ Licitação Perdida',
      body: `${licitacao.numero} - R$ ${licitacao.valor.toLocaleString('pt-BR')} - ${licitacao.orgao}`,
      tag: `loss-${licitacao.numero}`,
      requireInteraction: false,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    notifyVictory,
    notifyNewTender,
    notifyDispute,
    notifyUrgentDeadline,
    notifyLoss,
    isEnabled: permission === 'granted'
  };
}
