import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Target,
  Activity,
  Zap,
  Shield,
  Clock,
  ArrowUp,
  ArrowDown,
  Volume2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useVoiceAlerts } from '@/hooks/useVoiceAlerts';

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
  const [posicaoAtual, setPosicaoAtual] = useState(1);
  const [totalCompetidores, setTotalCompetidores] = useState(5);
  const [menorLanceAtual, setMenorLanceAtual] = useState(valorProposta);
  const [isSimulating, setIsSimulating] = useState(false);
  const [tempoRestante, setTempoRestante] = useState('02:34:15');
  
  // Voice alerts integration
  const { speakPosition, speakCalled, speakVictory, isEnabled: voiceEnabled } = useVoiceAlerts();
  const lastPositionRef = useRef<number>(1);
  const hasAnnouncedRef = useRef<Set<string>>(new Set());

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  useEffect(() => {
    if (!isActive) return;

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
        
        // Voice alert when position changes
        if (voiceEnabled && lastPositionRef.current !== 2) {
          speakPosition(2, totalCompetidores);
          lastPositionRef.current = 2;
        }
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
        
        // Voice alert when taking the lead
        if (voiceEnabled && lastPositionRef.current !== 1) {
          speakPosition(1, totalCompetidores);
          lastPositionRef.current = 1;
        }
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
    }, 6000);

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
  }, [valorProposta, isActive]);

  const getEventIcon = (tipo: Lance['tipo']) => {
    switch (tipo) {
      case 'lance_automatico':
        return <Bot className="w-4 h-4" />;
      case 'lance_recebido':
        return <ArrowDown className="w-4 h-4" />;
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
        return 'text-success bg-success/10';
      case 'lance_recebido':
        return 'text-warning bg-warning/10';
      case 'melhor_lance':
        return 'text-success bg-success/10';
      case 'disputa_iniciada':
        return 'text-primary bg-primary/10';
      case 'disputa_encerrada':
        return 'text-success bg-success/10';
      case 'alerta':
        return 'text-warning bg-warning/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const posicaoPercentual = ((totalCompetidores - posicaoAtual + 1) / totalCompetidores) * 100;

  return (
    <div className="space-y-4">
      {/* Status Dashboard */}
      <div className="grid grid-cols-4 gap-2">
        <Card className={posicaoAtual === 1 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}>
          <CardContent className="p-3 text-center">
            <Target className={`w-4 h-4 mx-auto mb-1 ${posicaoAtual === 1 ? 'text-success' : 'text-warning'}`} />
            <p className={`text-xl font-bold ${posicaoAtual === 1 ? 'text-success' : 'text-warning'}`}>
              {posicaoAtual}º
            </p>
            <p className="text-xs text-muted-foreground">de {totalCompetidores}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-primary">{totalCompetidores}</p>
            <p className="text-xs text-muted-foreground">ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-sm font-bold text-success">{formatCurrency(menorLanceAtual)}</p>
            <p className="text-xs text-muted-foreground">
              {posicaoAtual === 1 ? 'Seu' : 'Menor'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-3 text-center">
            <Timer className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold font-mono text-primary">{tempoRestante}</p>
            <p className="text-xs text-muted-foreground">restante</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Classificação</span>
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
        <Progress value={posicaoPercentual} className="h-2" />
      </div>

      {/* Robot Status */}
      <Card className="bg-gradient-to-r from-primary/10 to-success/10 border-primary/30">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="p-1.5 rounded-full bg-primary/20">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Robô Ativo</span>
                  <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-xs">
                    <Zap className="w-2 h-2 mr-0.5" />
                    Auto
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Margem: 8%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Lances</p>
              <p className="text-lg font-bold text-primary">
                {lances.filter(l => l.tipo === 'lance_automatico').length}
              </p>
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
            {isSimulating && (
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <div className="space-y-1 p-2">
              {lances.map((lance, index) => (
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
              ))}
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
