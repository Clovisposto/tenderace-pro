import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Bell,
  BellOff,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Filter,
  Settings,
  Trash2,
  MailCheck,
  Smartphone,
  MessageSquare,
  BellRing,
} from 'lucide-react';
import { useConfiguracoes, useUpdateConfiguracoes } from '@/hooks/useConfiguracoes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

interface Notification {
  id: string;
  type: 'vitoria' | 'derrota' | 'nova_licitacao' | 'prazo_urgente' | 'disputa' | 'ia_recomendacao';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'alta' | 'media' | 'baixa';
  licitacaoId?: string;
  data?: Record<string, unknown>;
}

const NOTIFICATION_TYPES = {
  vitoria: { icon: Trophy, color: 'text-success', bg: 'bg-success/10', label: 'Vitória' },
  derrota: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Derrota' },
  nova_licitacao: { icon: Target, color: 'text-primary', bg: 'bg-primary/10', label: 'Nova Licitação' },
  prazo_urgente: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Prazo Urgente' },
  disputa: { icon: Zap, color: 'text-accent', bg: 'bg-accent/10', label: 'Disputa Ativa' },
  ia_recomendacao: { icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10', label: 'Recomendação IA' },
};

export function NotificationCenter() {
  const { data: config } = useConfiguracoes();
  const updateConfig = useUpdateConfiguracoes();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Browser notifications hook
  const { 
    permission, 
    isSupported, 
    requestPermission, 
    notifyVictory, 
    notifyNewTender, 
    notifyDispute, 
    notifyLoss,
    notifyUrgentDeadline,
    isEnabled: pushEnabled 
  } = useBrowserNotifications();

  // Initialize sound preference from config
  useEffect(() => {
    if (config?.som_notificacao !== undefined) {
      setSoundEnabled(config.som_notificacao);
    }
  }, [config]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [soundEnabled]);

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'licitacoes',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLicitacao = payload.new as any;
            
            // Check if user wants nova_licitacao notifications
            if (config?.notificacoes_nova_licitacao) {
              const notification: Notification = {
                id: `notif-${Date.now()}`,
                type: 'nova_licitacao',
                title: 'Nova Licitação Captada',
                message: `${newLicitacao.orgao} - ${newLicitacao.objeto_resumido || newLicitacao.objeto?.substring(0, 50)}`,
                timestamp: new Date(),
                read: false,
                priority: newLicitacao.roi_score > 80 ? 'alta' : newLicitacao.roi_score > 60 ? 'media' : 'baixa',
                licitacaoId: newLicitacao.id,
              };
              
              setNotifications(prev => [notification, ...prev.slice(0, 49)]);
              playNotificationSound();
              
              // Send native browser push notification
              if (pushEnabled && config?.notificacoes_push) {
                notifyNewTender({
                  numero: newLicitacao.numero,
                  valor: newLicitacao.valor,
                  orgao: newLicitacao.orgao,
                  prioridade: notification.priority
                });
              }
              
              toast({
                title: notification.title,
                description: notification.message,
              });
            }
          }
          
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            const old = payload.old as any;
            
            // Check for status changes
            if (updated.status !== old.status) {
              if (updated.status === 'Vencida' && config?.notificacoes_vitoria) {
                const notification: Notification = {
                  id: `notif-${Date.now()}`,
                  type: 'vitoria',
                  title: '🎉 Licitação Vencida!',
                  message: `Parabéns! Você venceu: ${updated.objeto_resumido || updated.objeto?.substring(0, 50)}`,
                  timestamp: new Date(),
                  read: false,
                  priority: 'alta',
                  licitacaoId: updated.id,
                };
                
                setNotifications(prev => [notification, ...prev.slice(0, 49)]);
                playNotificationSound();
                
                // Send native browser push notification for victory
                if (pushEnabled && config?.notificacoes_push) {
                  notifyVictory({
                    numero: updated.numero,
                    valor: updated.valor,
                    orgao: updated.orgao
                  });
                }
                
                toast({
                  title: notification.title,
                  description: notification.message,
                  className: 'bg-success/10 border-success',
                });
              }
              
              if (updated.status === 'Perdida' && config?.notificacoes_derrota) {
                const notification: Notification = {
                  id: `notif-${Date.now()}`,
                  type: 'derrota',
                  title: 'Licitação Perdida',
                  message: `${updated.objeto_resumido || updated.objeto?.substring(0, 50)}`,
                  timestamp: new Date(),
                  read: false,
                  priority: 'media',
                  licitacaoId: updated.id,
                };
                
                setNotifications(prev => [notification, ...prev.slice(0, 49)]);
                
                // Send native browser push notification for loss
                if (pushEnabled && config?.notificacoes_push) {
                  notifyLoss({
                    numero: updated.numero,
                    valor: updated.valor,
                    orgao: updated.orgao
                  });
                }
              }
              
              if (updated.status === 'Em Disputa' && config?.notificacoes_disputa) {
                const notification: Notification = {
                  id: `notif-${Date.now()}`,
                  type: 'disputa',
                  title: 'Disputa Iniciada!',
                  message: `Robô ativo em: ${updated.objeto_resumido || updated.objeto?.substring(0, 50)}`,
                  timestamp: new Date(),
                  read: false,
                  priority: 'alta',
                  licitacaoId: updated.id,
                };
                
                setNotifications(prev => [notification, ...prev.slice(0, 49)]);
                playNotificationSound();
                
                // Send native browser push notification for dispute
                if (pushEnabled && config?.notificacoes_push) {
                  notifyDispute({
                    numero: updated.numero,
                    posicao: 1,
                    orgao: updated.orgao
                  });
                }
                
                toast({
                  title: notification.title,
                  description: notification.message,
                  className: 'bg-accent/10 border-accent',
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config, playNotificationSound, toast, pushEnabled, notifyVictory, notifyNewTender, notifyDispute, notifyLoss]);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    updateConfig.mutate({ som_notificacao: newValue });
  };

  const filteredNotifications = filterType
    ? notifications.filter(n => n.type === filterType)
    : notifications;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-destructive text-destructive-foreground font-medium"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Central de Notificações
            </SheetTitle>
            <div className="flex items-center gap-2">
              {/* Push notification permission button */}
              {isSupported && permission !== 'granted' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={requestPermission}
                  className="h-8 w-8"
                  title="Ativar notificações push"
                >
                  <BellRing className="w-4 h-4 text-warning animate-pulse" />
                </Button>
              )}
              {isSupported && permission === 'granted' && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                  <BellRing className="w-3 h-3" />
                  Push
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={toggleSound} className="h-8 w-8">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-primary" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-2 flex-wrap mt-2">
            <Badge
              variant={filterType === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterType(null)}
            >
              Todas
            </Badge>
            {Object.entries(NOTIFICATION_TYPES).map(([key, value]) => (
              <Badge
                key={key}
                variant={filterType === key ? "default" : "outline"}
                className="cursor-pointer gap-1"
                onClick={() => setFilterType(filterType === key ? null : key)}
              >
                <value.icon className="w-3 h-3" />
                {value.label}
              </Badge>
            ))}
          </div>
        </SheetHeader>

        {/* Actions Bar */}
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">
            {unreadCount} não lidas
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <MailCheck className="w-4 h-4 mr-1" />
              Marcar lidas
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[calc(100vh-280px)] mt-4">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground mt-1">
                As novas alertas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const typeConfig = NOTIFICATION_TYPES[notification.type];
                const Icon = typeConfig.icon;
                
                return (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !notification.read ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                          <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            {notification.priority === 'alta' && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Alta
                              </Badge>
                            )}
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Channel Status */}
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Canais ativos:</span>
                <div className="flex items-center gap-3">
                  {config?.notificacoes_email && (
                    <div className="flex items-center gap-1 text-success">
                      <MailCheck className="w-3 h-3" />
                      Email
                    </div>
                  )}
                  {config?.notificacoes_push && (
                    <div className="flex items-center gap-1 text-success">
                      <Bell className="w-3 h-3" />
                      Push
                    </div>
                  )}
                  {config?.notificacoes_telefone && (
                    <div className="flex items-center gap-1 text-success">
                      <MessageSquare className="w-3 h-3" />
                      WhatsApp
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
