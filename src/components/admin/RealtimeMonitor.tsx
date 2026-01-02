import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Radio, Clock, MapPin, Building2, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LicitacaoEvent {
  id: string;
  numero: string;
  orgao: string;
  municipio: string;
  uf: string;
  valor: number;
  portal: string;
  modalidade: string;
  status: string;
  created_at: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: Date;
}

export function RealtimeMonitor() {
  const [events, setEvents] = useState<LicitacaoEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({ total: 0, lastHour: 0 });

  useEffect(() => {
    const channel = supabase
      .channel('licitacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'licitacoes'
        },
        (payload) => {
          const newEvent: LicitacaoEvent = {
            ...(payload.new as any),
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            timestamp: new Date()
          };
          
          setEvents(prev => [newEvent, ...prev].slice(0, 50));
          
          if (payload.eventType === 'INSERT') {
            setStats(prev => ({
              total: prev.total + 1,
              lastHour: prev.lastHour + 1
            }));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Fetch initial stats
    const fetchStats = async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const [totalResult, hourResult] = await Promise.all([
        supabase.from('licitacoes').select('id', { count: 'exact', head: true }),
        supabase.from('licitacoes').select('id', { count: 'exact', head: true })
          .gte('created_at', oneHourAgo)
      ]);
      
      setStats({
        total: totalResult.count || 0,
        lastHour: hourResult.count || 0
      });
    };
    
    fetchStats();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getEventColor = (type: string) => {
    switch (type) {
      case 'INSERT': return 'bg-success/20 text-success border-success/30';
      case 'UPDATE': return 'bg-warning/20 text-warning border-warning/30';
      case 'DELETE': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'INSERT': return 'Nova';
      case 'UPDATE': return 'Atualizada';
      case 'DELETE': return 'Removida';
      default: return type;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Monitor em Tempo Real
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Última hora: <strong className="text-foreground">{stats.lastHour}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Radio className="h-12 w-12 opacity-30" />
              <p className="text-sm">Aguardando eventos...</p>
              <p className="text-xs opacity-70">Novas licitações aparecerão aqui em tempo real</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="group relative rounded-lg border border-border bg-secondary/30 p-4 transition-all hover:bg-secondary/50 hover:border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getEventColor(event.eventType)}>
                          {getEventLabel(event.eventType)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.portal}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(event.timestamp, 'HH:mm:ss', { locale: ptBR })}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium truncate mb-2">
                        {event.numero}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {event.orgao?.substring(0, 40)}...
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.municipio}/{event.uf}
                        </span>
                        <span className="flex items-center gap-1 text-success">
                          <Banknote className="h-3 w-3" />
                          {formatCurrency(event.valor)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
