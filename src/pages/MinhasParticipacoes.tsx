import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Clock, 
  MapPin, 
  Building2, 
  DollarSign, 
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  TrendingUp,
  Eye,
  Gavel,
  RefreshCw,
  Plus,
  Volume2,
  Bell
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Participacao {
  id: string;
  licitacao_id: string;
  empresa_id: string;
  status: string;
  valor_proposta: number;
  created_at: string;
  updated_at: string;
  licitacao: {
    id: string;
    numero: string;
    orgao: string;
    objeto: string;
    objeto_resumido: string;
    valor: number;
    modalidade: string;
    portal: string;
    uf: string;
    municipio: string;
    data_abertura: string;
    data_limite: string;
    status: string;
    segmento: string;
    roi_score: number;
    risco_score: number;
  };
  empresa: {
    nome: string;
    cnpj: string;
  };
}

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diffInSeconds = differenceInSeconds(target, now);
      
      if (diffInSeconds <= 0) {
        setIsExpired(true);
        setTimeLeft('Encerrado');
        return;
      }

      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;
      const seconds = diffInSeconds % 60;

      setIsUrgent(days === 0 && hours < 6);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm ${
      isExpired 
        ? 'bg-muted text-muted-foreground' 
        : isUrgent 
          ? 'bg-destructive/10 text-destructive animate-pulse' 
          : 'bg-primary/10 text-primary'
    }`}>
      <Timer className="w-4 h-4" />
      <span className="font-bold">{timeLeft}</span>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { color: string; icon: React.ReactNode }> = {
    'Rascunho': { color: 'bg-muted text-muted-foreground', icon: <FileText className="w-3 h-3" /> },
    'Enviada': { color: 'bg-blue-500/10 text-blue-600', icon: <CheckCircle2 className="w-3 h-3" /> },
    'Em Disputa': { color: 'bg-amber-500/10 text-amber-600', icon: <Gavel className="w-3 h-3" /> },
    'Vencedora': { color: 'bg-green-500/10 text-green-600', icon: <Trophy className="w-3 h-3" /> },
    'Perdedora': { color: 'bg-red-500/10 text-red-600', icon: <XCircle className="w-3 h-3" /> },
    'Cancelada': { color: 'bg-muted text-muted-foreground', icon: <AlertCircle className="w-3 h-3" /> },
  };

  const config = configs[status] || configs['Rascunho'];

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      {config.icon}
      {status}
    </Badge>
  );
};

const ParticipacaoCard = ({ participacao, isRealtime }: { participacao: Participacao; isRealtime?: boolean }) => {
  const { licitacao, empresa } = participacao;
  
  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
      isRealtime ? 'ring-2 ring-primary animate-pulse' : ''
    }`}>
      {participacao.status === 'Vencedora' && (
        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
          <div className="absolute top-3 -right-8 w-32 text-center text-xs font-bold text-white bg-green-500 transform rotate-45 py-1">
            VENCEDOR
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {licitacao.portal}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {licitacao.modalidade}
              </Badge>
              <StatusBadge status={participacao.status} />
            </div>
            <CardTitle className="text-base line-clamp-2">
              {licitacao.objeto_resumido || licitacao.objeto}
            </CardTitle>
          </div>
          <CountdownTimer targetDate={licitacao.data_limite} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{licitacao.orgao}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{licitacao.municipio}, {licitacao.uf}</span>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
            <p className="font-bold text-primary">
              R$ {licitacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Sua Proposta</p>
            <p className="font-bold text-green-600">
              R$ {participacao.valor_proposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Economia</p>
            <p className="font-bold text-amber-600">
              {((1 - participacao.valor_proposta / licitacao.valor) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span>ROI: {licitacao.roi_score}%</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Risco: {licitacao.risco_score}%</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1">
            <Eye className="w-4 h-4" />
            Ver Detalhes
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3 flex items-center justify-between">
          <span>Empresa: {empresa.nome}</span>
          <span>Enviada: {format(new Date(participacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const MinhasParticipacoes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [realtimeUpdates, setRealtimeUpdates] = useState<string[]>([]);
  const [creatingTest, setCreatingTest] = useState(false);

  // Mutation para criar propostas de teste
  const createTestProposalMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      // Primeiro, verificar se o usuário tem uma empresa
      const { data: empresas, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .limit(1);

      if (empresaError) throw empresaError;
      
      let empresaId: string;
      
      if (!empresas || empresas.length === 0) {
        // Criar empresa de teste
        const { data: novaEmpresa, error: createEmpresaError } = await supabase
          .from('empresas')
          .insert({
            user_id: user.id,
            nome: 'Empresa Teste',
            cnpj: '00.000.000/0001-00',
            razao_social: 'Empresa Teste LTDA',
            uf: 'PA',
            municipio: 'Belém',
            segmento: 'Medicamentos',
          })
          .select('id')
          .single();
        
        if (createEmpresaError) throw createEmpresaError;
        empresaId = novaEmpresa.id;
      } else {
        empresaId = empresas[0].id;
      }

      // Buscar licitações disponíveis
      const { data: licitacoes, error: licError } = await supabase
        .from('licitacoes')
        .select('id, valor')
        .limit(3);

      if (licError) throw licError;
      if (!licitacoes || licitacoes.length === 0) {
        throw new Error('Nenhuma licitação disponível. Execute a captura primeiro.');
      }

      // Criar propostas de teste com diferentes status
      const statusList: ('Enviada' | 'Em Disputa' | 'Vencedora')[] = ['Enviada', 'Em Disputa', 'Vencedora'];
      const propostas = licitacoes.slice(0, 3).map((lic, index) => ({
        empresa_id: empresaId,
        licitacao_id: lic.id,
        status: statusList[index % statusList.length] as 'Enviada' | 'Em Disputa' | 'Vencedora',
        valor_proposta: lic.valor * 0.95, // 5% abaixo do valor estimado
      }));

      const { data, error } = await supabase
        .from('propostas')
        .insert(propostas)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });
      toast({
        title: '🎉 Propostas de teste criadas!',
        description: `${data?.length || 0} propostas foram criadas com sucesso.`,
      });
      
      // Simular notificação de vitória
      if (data?.some(p => p.status === 'Vencedora')) {
        setTimeout(() => {
          playVictorySound();
          toast({
            title: '🏆 VITÓRIA! Parabéns!',
            description: 'Você venceu uma licitação de teste!',
            className: 'bg-green-500 text-white border-green-600',
          });
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar propostas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Função para tocar som de vitória
  const playVictorySound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.3); // C6
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Não foi possível tocar o som');
    }
  };

  const handleCreateTestProposals = () => {
    setCreatingTest(true);
    createTestProposalMutation.mutate();
    setTimeout(() => setCreatingTest(false), 2000);
  };

  // Fetch participações com join nas licitações e empresas
  const { data: participacoes = [], isLoading, refetch } = useQuery({
    queryKey: ['minhas-participacoes'],
    queryFn: async () => {
      const { data: propostas, error } = await supabase
        .from('propostas')
        .select(`
          id,
          licitacao_id,
          empresa_id,
          status,
          valor_proposta,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!propostas || propostas.length === 0) return [];

      // Buscar licitações relacionadas
      const licitacaoIds = [...new Set(propostas.map(p => p.licitacao_id))];
      const { data: licitacoes } = await supabase
        .from('licitacoes')
        .select('*')
        .in('id', licitacaoIds);

      // Buscar empresas relacionadas
      const empresaIds = [...new Set(propostas.map(p => p.empresa_id))];
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, nome, cnpj')
        .in('id', empresaIds);

      // Montar os dados completos
      return propostas.map(proposta => ({
        ...proposta,
        licitacao: licitacoes?.find(l => l.id === proposta.licitacao_id) || null,
        empresa: empresas?.find(e => e.id === proposta.empresa_id) || { nome: 'N/A', cnpj: 'N/A' }
      })).filter(p => p.licitacao !== null) as Participacao[];
    },
  });

  // Configurar realtime para atualizações de status
  useEffect(() => {
    const channel = supabase
      .channel('propostas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'propostas',
        },
        (payload) => {
          console.log('[Realtime] Proposta atualizada:', payload);
          
          const newRecord = payload.new as { id?: string } | null;
          if (newRecord && newRecord.id) {
            setRealtimeUpdates(prev => [...prev, newRecord.id as string]);
            queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });
            
            // Remover highlight após 5 segundos
            setTimeout(() => {
              setRealtimeUpdates(prev => prev.filter(id => id !== newRecord.id));
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filterByStatus = (status: string[]) => 
    participacoes.filter(p => status.includes(p.status));

  const emDisputa = filterByStatus(['Enviada', 'Em Disputa']);
  const vencidas = filterByStatus(['Vencedora']);
  const perdidas = filterByStatus(['Perdedora', 'Cancelada']);

  const stats = {
    total: participacoes.length,
    emDisputa: emDisputa.length,
    vencidas: vencidas.length,
    perdidas: perdidas.length,
    valorTotal: vencidas.reduce((acc, p) => acc + p.valor_proposta, 0),
    taxaSucesso: participacoes.length > 0 
      ? ((vencidas.length / participacoes.length) * 100).toFixed(1)
      : '0.0'
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Minhas Participações
            </h1>
            <p className="text-muted-foreground">
              Acompanhe suas licitações em tempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateTestProposals} 
              variant="default" 
              className="gap-2"
              disabled={creatingTest || createTestProposalMutation.isPending}
            >
              {creatingTest ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Criar Propostas de Teste
            </Button>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.emDisputa}</p>
              <p className="text-xs text-muted-foreground">Em Disputa</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.vencidas}</p>
              <p className="text-xs text-muted-foreground">Vencidas</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.perdidas}</p>
              <p className="text-xs text-muted-foreground">Perdidas</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 md:col-span-1 col-span-2">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-blue-600">
                R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Valor Total Vencido</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="disputa" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="todas" className="gap-2">
              Todas
              <Badge variant="secondary" className="ml-1">{stats.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disputa" className="gap-2">
              Em Disputa
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">{stats.emDisputa}</Badge>
            </TabsTrigger>
            <TabsTrigger value="vencidas" className="gap-2">
              Vencidas
              <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700">{stats.vencidas}</Badge>
            </TabsTrigger>
            <TabsTrigger value="perdidas" className="gap-2">
              Perdidas
              <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700">{stats.perdidas}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todas">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid gap-4 md:grid-cols-2">
                {participacoes.length === 0 ? (
                  <Card className="col-span-2 p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma participação encontrada</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Envie propostas para licitações para vê-las aqui
                    </p>
                  </Card>
                ) : (
                  participacoes.map(p => (
                    <ParticipacaoCard 
                      key={p.id} 
                      participacao={p} 
                      isRealtime={realtimeUpdates.includes(p.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="disputa">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid gap-4 md:grid-cols-2">
                {emDisputa.length === 0 ? (
                  <Card className="col-span-2 p-8 text-center">
                    <Gavel className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma licitação em disputa</p>
                  </Card>
                ) : (
                  emDisputa.map(p => (
                    <ParticipacaoCard 
                      key={p.id} 
                      participacao={p} 
                      isRealtime={realtimeUpdates.includes(p.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="vencidas">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid gap-4 md:grid-cols-2">
                {vencidas.length === 0 ? (
                  <Card className="col-span-2 p-8 text-center">
                    <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma licitação vencida ainda</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Continue participando para conquistar suas primeiras vitórias!
                    </p>
                  </Card>
                ) : (
                  vencidas.map(p => (
                    <ParticipacaoCard 
                      key={p.id} 
                      participacao={p} 
                      isRealtime={realtimeUpdates.includes(p.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="perdidas">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid gap-4 md:grid-cols-2">
                {perdidas.length === 0 ? (
                  <Card className="col-span-2 p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">Nenhuma licitação perdida!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Excelente desempenho!
                    </p>
                  </Card>
                ) : (
                  perdidas.map(p => (
                    <ParticipacaoCard 
                      key={p.id} 
                      participacao={p} 
                      isRealtime={realtimeUpdates.includes(p.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default MinhasParticipacoes;
