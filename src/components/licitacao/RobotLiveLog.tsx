import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  TrendingDown,
  Users,
  Timer,
  Gavel,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Target,
  Activity,
  Zap,
  Shield,
  Clock,
  ArrowDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Lance {
  id: string;
  timestamp: Date;
  tipo: 'lance_enviado' | 'lance_recebido' | 'melhor_lance' | 'lance_automatico' | 'disputa_iniciada' | 'disputa_encerrada' | 'alerta';
  valor?: number;
  posicao?: number;
  competidores?: number;
  menorLance?: number;
  descricao: string;
  empresa?: string;
}

interface RobotLiveLogProps {
  licitacaoId: string;
  valorProposta: number;
  isActive?: boolean;
}

export function RobotLiveLog({ licitacaoId, valorProposta, isActive = true }: RobotLiveLogProps) {
  const [lances, setLances] = useState<Lance[]>([]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Fetch real historico_disputas from DB
  const { data: historico } = useQuery({
    queryKey: ['historico-disputas', licitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_disputas')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
    enabled: !!licitacaoId,
  });

  // Map real DB records to Lance format
  useEffect(() => {
    if (!historico || historico.length === 0) {
      setLances([]);
      return;
    }

    const mapped: Lance[] = historico.map((h) => ({
      id: h.id,
      timestamp: new Date(h.created_at),
      tipo: (h.evento as Lance['tipo']) || 'alerta',
      valor: h.valor_lance ?? undefined,
      posicao: h.posicao ?? undefined,
      competidores: h.competidores ?? undefined,
      menorLance: h.menor_lance ?? undefined,
      descricao: h.evento || 'Evento registrado',
      empresa: undefined,
    }));

    setLances(mapped);
  }, [historico]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!isActive || !licitacaoId) return;

    const channel = supabase
      .channel(`historico-${licitacaoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historico_disputas',
          filter: `licitacao_id=eq.${licitacaoId}`,
        },
        (payload) => {
          const h = payload.new as any;
          const novoLance: Lance = {
            id: h.id,
            timestamp: new Date(h.created_at),
            tipo: (h.evento as Lance['tipo']) || 'alerta',
            valor: h.valor_lance ?? undefined,
            posicao: h.posicao ?? undefined,
            competidores: h.competidores ?? undefined,
            menorLance: h.menor_lance ?? undefined,
            descricao: h.evento || 'Evento registrado',
          };
          setLances((prev) => [novoLance, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [licitacaoId, isActive]);

  // Derive live stats from real data
  const ultimoLance = lances[0];
  const posicaoAtual = ultimoLance?.posicao ?? 0;
  const totalCompetidores = ultimoLance?.competidores ?? 0;
  const menorLanceAtual = ultimoLance?.menorLance ?? 0;
  const lancesEnviados = lances.filter((l) => l.tipo === 'lance_automatico').length;
  const posicaoPercentual = totalCompetidores > 0
    ? ((totalCompetidores - posicaoAtual + 1) / totalCompetidores) * 100
    : 0;

  const getEventIcon = (tipo: Lance['tipo']) => {
    switch (tipo) {
      case 'lance_automatico': return <Bot className="w-4 h-4" />;
      case 'lance_recebido': return <ArrowDown className="w-4 h-4" />;
      case 'melhor_lance': return <Trophy className="w-4 h-4" />;
      case 'disputa_iniciada': return <Gavel className="w-4 h-4" />;
      case 'disputa_encerrada': return <CheckCircle2 className="w-4 h-4" />;
      case 'alerta': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (tipo: Lance['tipo']) => {
    switch (tipo) {
      case 'lance_automatico': return 'text-success bg-success/10';
      case 'lance_recebido': return 'text-warning bg-warning/10';
      case 'melhor_lance': return 'text-success bg-success/10';
      case 'disputa_iniciada': return 'text-primary bg-primary/10';
      case 'disputa_encerrada': return 'text-success bg-success/10';
      case 'alerta': return 'text-warning bg-warning/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Dashboard */}
      <div className="grid grid-cols-3 gap-2">
        <Card className={posicaoAtual === 1 && posicaoAtual > 0 ? 'bg-success/10 border-success/30' : 'bg-muted/30'}>
          <CardContent className="p-3 text-center">
            <Target className={`w-4 h-4 mx-auto mb-1 ${posicaoAtual === 1 && posicaoAtual > 0 ? 'text-success' : 'text-muted-foreground'}`} />
            <p className={`text-xl font-bold ${posicaoAtual === 1 && posicaoAtual > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {posicaoAtual > 0 ? `${posicaoAtual}º` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalCompetidores > 0 ? `de ${totalCompetidores}` : 'posição'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-primary">{totalCompetidores > 0 ? totalCompetidores : '—'}</p>
            <p className="text-xs text-muted-foreground">competidores</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-sm font-bold text-success">
              {menorLanceAtual > 0 ? formatCurrency(menorLanceAtual) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">menor lance</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {totalCompetidores > 0 && posicaoAtual > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Classificação</span>
            <Badge variant={posicaoAtual === 1 ? 'default' : 'secondary'} className={posicaoAtual === 1 ? 'bg-success' : ''}>
              {posicaoAtual === 1 ? (
                <><Trophy className="w-3 h-3 mr-1" />Líder</>
              ) : (
                `${posicaoAtual}º lugar`
              )}
            </Badge>
          </div>
          <Progress value={posicaoPercentual} className="h-2" />
        </div>
      )}

      {/* Robot Status */}
      <Card className="bg-gradient-to-r from-primary/10 to-success/10 border-primary/30">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="p-1.5 rounded-full bg-primary/20">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Robô {isActive ? 'Ativo' : 'Inativo'}</span>
                  {isActive && (
                    <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-xs">
                      <Zap className="w-2 h-2 mr-0.5" />
                      Auto
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Monitorando em tempo real</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Lances</p>
              <p className="text-lg font-bold text-primary">{lancesEnviados}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Log */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              Log em Tempo Real
            </div>
            {lances.length > 0 && (
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <div className="space-y-1 p-2">
              {lances.length > 0 ? (
                lances.map((lance, index) => (
                  <div
                    key={lance.id}
                    className={`p-2 rounded-lg border text-xs ${getEventColor(lance.tipo)} ${
                      index === 0 ? 'ring-1 ring-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded-full">
                        {getEventIcon(lance.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-medium truncate">{lance.descricao}</p>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {format(lance.timestamp, 'HH:mm:ss')}
                          </span>
                        </div>
                        {(lance.valor || lance.empresa) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lance.valor && (
                              <Badge variant="outline" className="text-xs h-5">
                                {formatCurrency(lance.valor)}
                              </Badge>
                            )}
                            {lance.posicao && (
                              <Badge variant="outline" className="text-xs h-5">
                                {lance.posicao}º
                              </Badge>
                            )}
                            {lance.empresa && (
                              <Badge variant="secondary" className="text-xs h-5 truncate max-w-[100px]">
                                {lance.empresa}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground gap-2">
                  <Clock className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">Aguardando eventos da disputa</p>
                  <p className="text-xs">O log será preenchido automaticamente quando a disputa iniciar</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <div className="p-2 rounded bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
        <Shield className="w-3 h-3 mt-0.5 shrink-0" />
        <p>
          <strong>Lei 14.133/2021:</strong> Lances automáticos em conformidade legal.
        </p>
      </div>
    </div>
  );
}
