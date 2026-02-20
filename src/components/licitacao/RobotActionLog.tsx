import { useState, useEffect } from 'react';
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
  Clock,
  Target,
  Activity,
  Zap,
  Shield,
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

interface RobotActionLogProps {
  licitacaoId: string;
  propostaId: string;
  empresaId: string;
  valorProposta: number;
  status: string;
}

export function RobotActionLog({
  licitacaoId,
  valorProposta,
  status,
}: RobotActionLogProps) {
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
    if (!licitacaoId) return;

    const channel = supabase
      .channel(`robot-action-log-${licitacaoId}`)
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
  }, [licitacaoId]);

  // Derive stats from real data
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
      case 'lance_automatico': return 'text-success bg-success/10 border-success/30';
      case 'lance_recebido': return 'text-warning bg-warning/10 border-warning/30';
      case 'melhor_lance': return 'text-success bg-success/10 border-success/30';
      case 'disputa_iniciada': return 'text-primary bg-primary/10 border-primary/30';
      case 'disputa_encerrada': return 'text-success bg-success/10 border-success/30';
      case 'alerta': return 'text-warning bg-warning/10 border-warning/30';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const isEmDisputa = status === 'Em Disputa' || status === 'Enviada';

  return (
    <div className="space-y-4">
      {/* Status Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className={posicaoAtual === 1 && posicaoAtual > 0 ? 'bg-success/10 border-success/30' : 'bg-muted/30'}>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className={`w-4 h-4 ${posicaoAtual === 1 && posicaoAtual > 0 ? 'text-success' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">Posição</span>
            </div>
            <p className={`text-2xl font-bold ${posicaoAtual === 1 && posicaoAtual > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {posicaoAtual > 0 ? `${posicaoAtual}º` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalCompetidores > 0 ? `de ${totalCompetidores}` : 'sem dados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Competidores</span>
            </div>
            <p className="text-2xl font-bold text-primary">{totalCompetidores > 0 ? totalCompetidores : '—'}</p>
            <p className="text-xs text-muted-foreground">ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Menor Lance</span>
            </div>
            <p className="text-sm font-bold text-success">
              {menorLanceAtual > 0 ? formatCurrency(menorLanceAtual) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {posicaoAtual === 1 && menorLanceAtual > 0 ? 'Sua proposta' : 'sem dados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Position Progress */}
      {totalCompetidores > 0 && posicaoAtual > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Classificação na Disputa</span>
              <Badge variant={posicaoAtual === 1 ? 'default' : 'secondary'} className={posicaoAtual === 1 ? 'bg-success' : ''}>
                {posicaoAtual === 1 ? (
                  <><Trophy className="w-3 h-3 mr-1" />Líder</>
                ) : (
                  `${posicaoAtual}º lugar`
                )}
              </Badge>
            </div>
            <Progress value={posicaoPercentual} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Último ({totalCompetidores}º)</span>
              <span>Líder (1º)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Robot Status */}
      <Card className="bg-gradient-to-r from-primary/10 to-success/10 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 rounded-full bg-primary/20">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isEmDisputa ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Robô {isEmDisputa ? 'Ativo' : 'Aguardando'}</h3>
                  {isEmDisputa && (
                    <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Automático
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Monitorando em tempo real</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Lances enviados</p>
              <p className="text-2xl font-bold text-primary">{lancesEnviados}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Log de Ações em Tempo Real
            </div>
            {lances.length > 0 && (
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {lances.length > 0 ? (
              <div className="space-y-3">
                {lances.map((lance, index) => (
                  <div
                    key={lance.id}
                    className={`p-3 rounded-lg border text-sm ${getEventColor(lance.tipo)} ${
                      index === 0 ? 'ring-1 ring-primary/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-background/50 shrink-0">
                        {getEventIcon(lance.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{lance.descricao}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(lance.timestamp, 'HH:mm:ss', { locale: ptBR })}
                          </span>
                        </div>
                        {(lance.valor || lance.posicao || lance.competidores) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {lance.valor && (
                              <Badge variant="outline" className="text-xs h-5">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                {formatCurrency(lance.valor)}
                              </Badge>
                            )}
                            {lance.posicao && (
                              <Badge variant="outline" className="text-xs h-5">
                                <Target className="w-3 h-3 mr-1" />
                                {lance.posicao}º lugar
                              </Badge>
                            )}
                            {lance.competidores && (
                              <Badge variant="outline" className="text-xs h-5">
                                <Users className="w-3 h-3 mr-1" />
                                {lance.competidores} competidores
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-center text-muted-foreground gap-2">
                <Clock className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">Aguardando eventos da disputa</p>
                <p className="text-xs opacity-70">
                  O log será preenchido automaticamente quando a disputa iniciar.<br />
                  Nenhum dado simulado é exibido.
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <strong>Lei 14.133/2021:</strong> Todos os eventos exibidos são registros reais do banco de dados.
            Nenhum dado simulado ou fictício é utilizado neste painel.
          </p>
        </div>
      </div>
    </div>
  );
}
