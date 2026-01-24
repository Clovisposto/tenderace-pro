import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  TrendingDown,
  TrendingUp,
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

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
  propostaId,
  empresaId,
  valorProposta,
  status,
}: RobotActionLogProps) {
  const [lances, setLances] = useState<Lance[]>([]);
  const [posicaoAtual, setPosicaoAtual] = useState(1);
  const [totalCompetidores, setTotalCompetidores] = useState(5);
  const [menorLanceAtual, setMenorLanceAtual] = useState(valorProposta);
  const [isSimulating, setIsSimulating] = useState(false);
  const [tempoRestante, setTempoRestante] = useState('02:34:15');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Simulate real-time updates
  useEffect(() => {
    // Initial historical data
    const initialLances: Lance[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000 * 2),
        tipo: 'disputa_iniciada',
        descricao: 'Fase de disputa iniciada pelo pregoeiro',
        competidores: 8,
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000 * 1.8),
        tipo: 'lance_automatico',
        valor: valorProposta,
        posicao: 3,
        competidores: 8,
        menorLance: valorProposta * 0.95,
        descricao: 'Lance inicial registrado pelo robô',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 3600000 * 1.5),
        tipo: 'lance_recebido',
        valor: valorProposta * 0.97,
        posicao: 4,
        competidores: 8,
        menorLance: valorProposta * 0.93,
        descricao: 'Concorrente cobriu sua oferta',
        empresa: 'FARMA NORTE LTDA',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 3600000 * 1.2),
        tipo: 'lance_automatico',
        valor: valorProposta * 0.92,
        posicao: 2,
        competidores: 7,
        menorLance: valorProposta * 0.91,
        descricao: 'Robô enviou lance automático (margem: 8.5%)',
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 3600000),
        tipo: 'alerta',
        descricao: 'Atenção: 2 competidores desistiram da disputa',
        competidores: 5,
      },
      {
        id: '6',
        timestamp: new Date(Date.now() - 1800000),
        tipo: 'lance_automatico',
        valor: valorProposta * 0.89,
        posicao: 1,
        competidores: 5,
        menorLance: valorProposta * 0.89,
        descricao: 'Robô assumiu a liderança! Melhor proposta atual',
      },
    ];

    setLances(initialLances);
    setPosicaoAtual(1);
    setTotalCompetidores(5);
    setMenorLanceAtual(valorProposta * 0.89);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setIsSimulating(true);
      
      const eventTypes: Lance['tipo'][] = ['lance_recebido', 'lance_automatico', 'alerta'];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      let newLance: Lance;
      
      if (randomType === 'lance_recebido') {
        const novoValor = menorLanceAtual * (0.995 + Math.random() * 0.01);
        newLance = {
          id: Date.now().toString(),
          timestamp: new Date(),
          tipo: 'lance_recebido',
          valor: novoValor,
          posicao: 2,
          competidores: totalCompetidores,
          menorLance: novoValor,
          descricao: 'Concorrente enviou novo lance',
          empresa: ['PHARMA SUL LTDA', 'MEDIC CENTER', 'DROGARIA POPULAR'][Math.floor(Math.random() * 3)],
        };
        setPosicaoAtual(2);
        setMenorLanceAtual(novoValor);
      } else if (randomType === 'lance_automatico') {
        const novoValor = menorLanceAtual * 0.995;
        newLance = {
          id: Date.now().toString(),
          timestamp: new Date(),
          tipo: 'lance_automatico',
          valor: novoValor,
          posicao: 1,
          competidores: totalCompetidores,
          menorLance: novoValor,
          descricao: 'Robô respondeu automaticamente mantendo margem mínima',
        };
        setPosicaoAtual(1);
        setMenorLanceAtual(novoValor);
      } else {
        newLance = {
          id: Date.now().toString(),
          timestamp: new Date(),
          tipo: 'alerta',
          descricao: 'Sistema verificou regularidade SICAF dos competidores',
          competidores: totalCompetidores,
        };
      }

      setLances(prev => [newLance, ...prev].slice(0, 50));
      setIsSimulating(false);
    }, 8000);

    // Update countdown
    const countdownInterval = setInterval(() => {
      setTempoRestante(prev => {
        const [h, m, s] = prev.split(':').map(Number);
        let totalSeconds = h * 3600 + m * 60 + s - 1;
        if (totalSeconds < 0) totalSeconds = 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [valorProposta]);

  const getEventIcon = (tipo: Lance['tipo']) => {
    switch (tipo) {
      case 'lance_automatico':
        return <Bot className="w-4 h-4" />;
      case 'lance_recebido':
        return <TrendingDown className="w-4 h-4" />;
      case 'melhor_lance':
        return <Trophy className="w-4 h-4" />;
      case 'disputa_iniciada':
        return <Gavel className="w-4 h-4" />;
      case 'disputa_encerrada':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'alerta':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (tipo: Lance['tipo']) => {
    switch (tipo) {
      case 'lance_automatico':
        return 'bg-success text-success';
      case 'lance_recebido':
        return 'bg-warning text-warning';
      case 'melhor_lance':
        return 'bg-success text-success';
      case 'disputa_iniciada':
        return 'bg-primary text-primary';
      case 'disputa_encerrada':
        return 'bg-success text-success';
      case 'alerta':
        return 'bg-warning text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getEventBgColor = (tipo: Lance['tipo']) => {
    switch (tipo) {
      case 'lance_automatico':
        return 'bg-success/10 border-success/30';
      case 'lance_recebido':
        return 'bg-warning/10 border-warning/30';
      case 'melhor_lance':
        return 'bg-success/10 border-success/30';
      case 'disputa_iniciada':
        return 'bg-primary/10 border-primary/30';
      case 'disputa_encerrada':
        return 'bg-success/10 border-success/30';
      case 'alerta':
        return 'bg-warning/10 border-warning/30';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  const posicaoPercentual = ((totalCompetidores - posicaoAtual + 1) / totalCompetidores) * 100;

  return (
    <div className="space-y-4">
      {/* Status Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`${posicaoAtual === 1 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className={`w-4 h-4 ${posicaoAtual === 1 ? 'text-success' : 'text-warning'}`} />
              <span className="text-xs text-muted-foreground">Posição</span>
            </div>
            <p className={`text-2xl font-bold ${posicaoAtual === 1 ? 'text-success' : 'text-warning'}`}>
              {posicaoAtual}º
            </p>
            <p className="text-xs text-muted-foreground">de {totalCompetidores}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Competidores</span>
            </div>
            <p className="text-2xl font-bold text-primary">{totalCompetidores}</p>
            <p className="text-xs text-muted-foreground">ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Menor Lance</span>
            </div>
            <p className="text-lg font-bold text-success">{formatCurrency(menorLanceAtual)}</p>
            <p className="text-xs text-muted-foreground">
              {posicaoAtual === 1 ? 'Sua proposta' : 'Concorrente'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tempo</span>
            </div>
            <p className="text-xl font-bold font-mono text-primary">{tempoRestante}</p>
            <p className="text-xs text-muted-foreground">restante</p>
          </CardContent>
        </Card>
      </div>

      {/* Position Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Classificação na Disputa</span>
            <Badge variant={posicaoAtual === 1 ? 'default' : 'secondary'} className={posicaoAtual === 1 ? 'bg-success' : ''}>
              {posicaoAtual === 1 ? (
                <>
                  <Trophy className="w-3 h-3 mr-1" />
                  Líder
                </>
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

      {/* Robot Status */}
      <Card className="bg-gradient-to-r from-primary/10 to-success/10 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 rounded-full bg-primary/20">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Robô de Lances</h3>
                  <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Automático
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Margem mínima configurada: <strong>8%</strong>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Lances enviados</p>
              <p className="text-2xl font-bold text-primary">
                {lances.filter(l => l.tipo === 'lance_automatico').length}
              </p>
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
            {isSimulating && (
              <Badge variant="outline" className="bg-primary/10 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
                Atualizando...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {lances.map((lance, index) => (
                <div
                  key={lance.id}
                  className={`p-3 rounded-lg border ${getEventBgColor(lance.tipo)} ${
                    index === 0 ? 'animate-fade-in' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getEventColor(lance.tipo).split(' ')[0]}/20`}>
                      <span className={getEventColor(lance.tipo).split(' ')[1]}>
                        {getEventIcon(lance.tipo)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{lance.descricao}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(lance.timestamp, 'HH:mm:ss', { locale: ptBR })}
                        </span>
                      </div>
                      
                      {(lance.valor || lance.posicao || lance.empresa) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {lance.valor && (
                            <Badge variant="outline" className="text-xs">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              {formatCurrency(lance.valor)}
                            </Badge>
                          )}
                          {lance.posicao && (
                            <Badge variant="outline" className="text-xs">
                              <Target className="w-3 h-3 mr-1" />
                              {lance.posicao}º lugar
                            </Badge>
                          )}
                          {lance.competidores && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {lance.competidores} competidores
                            </Badge>
                          )}
                          {lance.empresa && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              {lance.empresa}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <strong>Conformidade Legal:</strong> Todos os lances são registrados em conformidade com a
            Lei nº 14.133/2021 (Nova Lei de Licitações). O robô respeita os intervalos mínimos entre
            lances e a margem de preferência configurada pelo operador.
          </p>
        </div>
      </div>
    </div>
  );
}
