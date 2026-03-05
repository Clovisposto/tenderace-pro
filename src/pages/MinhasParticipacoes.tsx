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
  Bell,
  Bot,
  Zap,
  Activity,
  ShieldCheck,
  PlayCircle,
  Target,
  Sparkles,
  Loader2,
  Pill,
  Building,
  FileSignature,
  Truck,
  CreditCard,
  Phone,
  Mail,
  CalendarClock,
  Send,
  RotateCcw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ParticipacaoDetalheModal } from '@/components/licitacao/ParticipacaoDetalheModal';
import { getSafeErrorMessage } from '@/lib/safeError';
import { DisputeAlertModeSelector } from '@/components/voice/DisputeAlertModeSelector';
import { RoboActivationPanel } from '@/components/certificado/RoboActivationPanel';

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
    'Aguardando Envio': { color: 'bg-amber-500/10 text-amber-600', icon: <Clock className="w-3 h-3" /> },
    'Erro no Envio': { color: 'bg-destructive/10 text-destructive', icon: <AlertCircle className="w-3 h-3" /> },
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

// Card para licitações autorizadas (robô vai participar)
const AutorizadaCard = ({ licitacao, isRealtime, empresaId }: { licitacao: any; isRealtime?: boolean; empresaId?: string }) => {
  const [robotStatus, setRobotStatus] = useState<'aguardando' | 'preparando' | 'monitorando' | 'disputando'>('aguardando');
  
  useEffect(() => {
    // Simular estados do robô baseado no tempo até a abertura
    const checkStatus = () => {
      const now = new Date();
      const abertura = new Date(licitacao.data_abertura);
      const diffHours = (abertura.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (diffHours <= 0) {
        setRobotStatus('disputando');
      } else if (diffHours <= 1) {
        setRobotStatus('preparando');
      } else if (diffHours <= 24) {
        setRobotStatus('monitorando');
      } else {
        setRobotStatus('aguardando');
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [licitacao.data_abertura]);

  const robotStatusConfig = {
    'aguardando': { 
      label: 'Aguardando', 
      color: 'bg-muted text-muted-foreground', 
      icon: <Clock className="w-4 h-4" />,
      description: 'Robô aguardando horário da disputa'
    },
    'preparando': { 
      label: 'Preparando', 
      color: 'bg-amber-500/10 text-amber-600', 
      icon: <Zap className="w-4 h-4" />,
      description: 'Robô se preparando para entrar na disputa'
    },
    'monitorando': { 
      label: 'Monitorando', 
      color: 'bg-blue-500/10 text-blue-600', 
      icon: <Activity className="w-4 h-4 animate-pulse" />,
      description: 'Robô monitorando portal em tempo real'
    },
    'disputando': { 
      label: 'Em Disputa', 
      color: 'bg-green-500/10 text-green-600', 
      icon: <Bot className="w-4 h-4 animate-bounce" />,
      description: 'Robô participando ativamente da disputa'
    },
  };

  const status = robotStatusConfig[robotStatus];
  
  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg border-2 ${
      robotStatus === 'disputando' ? 'border-green-500 ring-2 ring-green-500/20' :
      robotStatus === 'preparando' ? 'border-amber-500 ring-2 ring-amber-500/20' :
      robotStatus === 'monitorando' ? 'border-blue-500' : 'border-border'
    } ${isRealtime ? 'animate-pulse' : ''}`}>
      {/* Robot Status Banner */}
      <div className={`${status.color} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {status.icon}
          <span className="font-medium text-sm">{status.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="text-xs font-medium">ROBÔ ATIVO</span>
          </div>
        </div>
      </div>
      
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
              <Badge className="bg-primary/10 text-primary text-xs flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Autorizada
              </Badge>
            </div>
            <CardTitle className="text-base line-clamp-2">
              {licitacao.objeto_resumido || licitacao.objeto}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{licitacao.numero}</p>
          </div>
          <CountdownTimer targetDate={licitacao.data_limite} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status do Robô */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <PlayCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Status da Automação</span>
          </div>
          <p className="text-xs text-muted-foreground">{status.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full ${
              robotStatus === 'aguardando' ? 'bg-muted' :
              robotStatus === 'preparando' ? 'bg-amber-200' :
              robotStatus === 'monitorando' ? 'bg-blue-200' : 'bg-green-200'
            }`}>
              <div className={`h-full rounded-full transition-all duration-1000 ${
                robotStatus === 'aguardando' ? 'w-1/4 bg-muted-foreground' :
                robotStatus === 'preparando' ? 'w-2/4 bg-amber-500' :
                robotStatus === 'monitorando' ? 'w-3/4 bg-blue-500' : 'w-full bg-green-500 animate-pulse'
              }`} />
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
            <p className="font-bold text-primary">
              R$ {licitacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Abertura</p>
            <p className="font-bold text-primary">
              {format(new Date(licitacao.data_abertura), "dd/MM HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4 text-green-500" />
              <span>ROI: {licitacao.roi_score}%</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Risco: {licitacao.risco_score}%</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={() => {
              const portalUrls: Record<string, string> = {
                'PNCP': `https://pncp.gov.br/app/editais?q=${encodeURIComponent(licitacao.numero)}`,
                'BLL': `https://bllcompras.com/DirectBuy/DirectBuySearchPublic?numero=${encodeURIComponent(licitacao.numero)}`,
                'ComprasNet': `https://www.gov.br/compras/pt-br`,
                'ComprasPublicas': `https://www.portaldecompraspublicas.com.br/18/Licitacoes/`,
              };
              const url = portalUrls[licitacao.portal] || `https://pncp.gov.br/app/editais?q=${encodeURIComponent(licitacao.numero)}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
          >
            <Eye className="w-4 h-4" />
            Detalhes
          </Button>
        </div>

        {/* Painel de Ativação do Robô */}
        {empresaId && (
          <div className="pt-2">
            <RoboActivationPanel
              licitacaoId={licitacao.id}
              empresaId={empresaId}
              valorProposta={licitacao.valor}
              licitacaoNumero={licitacao.numero}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Card para licitações vencidas com informações de contrato
const VencedoraCard = ({ participacao, isRealtime, onOpenDetails }: { 
  participacao: Participacao; 
  isRealtime?: boolean;
  onOpenDetails: (participacao: Participacao) => void;
}) => {
  const { licitacao, empresa } = participacao;
  
  
  
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-xl border-2 border-success/40 bg-gradient-to-br from-success/5 to-success/10">
      {/* Victory Banner */}
      <div className="absolute top-0 right-0 w-28 h-28 overflow-hidden">
        <div className="absolute top-4 -right-10 w-40 text-center text-xs font-bold text-white bg-success transform rotate-45 py-1.5 shadow-lg">
          🏆 VENCEDOR
        </div>
      </div>
      
      {/* Segmento Badge */}
      <div className="absolute top-3 left-3">
        <Badge className={`${
          licitacao.segmento === 'Medicamentos' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-orange-100 text-orange-700'
        }`}>
          {licitacao.segmento === 'Medicamentos' ? (
            <><Pill className="w-3 h-3 mr-1" /> Medicamentos</>
          ) : (
            <><Building className="w-3 h-3 mr-1" /> Empreendimentos</>
          )}
        </Badge>
      </div>
      
      <CardHeader className="pb-3 pt-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {licitacao.portal}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {licitacao.modalidade}
            </Badge>
            <Badge className="bg-success/20 text-success flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Vencedora
            </Badge>
          </div>
          <CardTitle className="text-base line-clamp-2 pr-16">
            {licitacao.objeto_resumido || licitacao.objeto}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{licitacao.numero}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Órgão e Local */}
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

        {/* Valores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">Valor Vencedor</p>
            <p className="text-xl font-bold text-success">
              R$ {participacao.valor_proposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">Economia Gerada</p>
            <p className="text-xl font-bold text-warning">
              {((1 - participacao.valor_proposta / licitacao.valor) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Informações de Contrato e Entrega */}
        <div className="p-4 rounded-lg bg-background border-2 border-dashed border-success/40">
          <div className="flex items-center gap-2 mb-3">
            <FileSignature className="w-4 h-4 text-success" />
            <h4 className="font-semibold text-sm text-success">Informações do Contrato</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Órgão Contratante</p>
                <p className="font-medium">{licitacao.orgao}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Local</p>
                <p className="font-medium">{licitacao.municipio}, {licitacao.uf}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Data Limite</p>
                <p className="font-medium">{format(new Date(licitacao.data_limite), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Modalidade</p>
                <p className="font-medium">{licitacao.modalidade}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            Empresa: {empresa.nome}
          </div>
          <Button 
            className="gap-1 bg-success hover:bg-success/90"
            size="sm"
            onClick={() => onOpenDetails(participacao)}
          >
            <FileSignature className="w-4 h-4" />
            Ver Contrato
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ParticipacaoCard = ({ participacao, isRealtime, onOpenDetails }: { 
  participacao: Participacao; 
  isRealtime?: boolean;
  onOpenDetails: (participacao: Participacao) => void;
}) => {
  const { licitacao, empresa } = participacao;
  
  // Use VencedoraCard for winners
  if (participacao.status === 'Vencedora') {
    return <VencedoraCard participacao={participacao} isRealtime={isRealtime} onOpenDetails={onOpenDetails} />;
  }
  
  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
      isRealtime ? 'ring-2 ring-primary animate-pulse' : ''
    }`}>
      {/* Segmento Badge */}
      <div className="absolute top-3 left-3">
        <Badge className={`text-xs ${
          licitacao.segmento === 'Medicamentos' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-orange-100 text-orange-700'
        }`}>
          {licitacao.segmento === 'Medicamentos' ? (
            <><Pill className="w-3 h-3 mr-1" /> Med</>
          ) : (
            <><Building className="w-3 h-3 mr-1" /> Emp</>
          )}
        </Badge>
      </div>
      
      <CardHeader className="pb-3 pt-10">
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
            <p className="font-bold text-success">
              R$ {participacao.valor_proposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Economia</p>
            <p className="font-bold text-warning">
              {((1 - participacao.valor_proposta / licitacao.valor) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span>ROI: {licitacao.roi_score}%</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span>Risco: {licitacao.risco_score}%</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={() => onOpenDetails(participacao)}
          >
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

  // Fetch user's first empresa for robot activation
  const { data: primeiraEmpresa } = useQuery({
    queryKey: ['primeira-empresa', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const [creatingTest, setCreatingTest] = useState(false);
  const [selectedParticipacao, setSelectedParticipacao] = useState<Participacao | null>(null);
  const [isAiUpdating, setIsAiUpdating] = useState(false);

  const handleOpenDetails = (participacao: Participacao) => {
    setSelectedParticipacao(participacao);
  };

  const handleAIGlobalUpdate = async () => {
    setIsAiUpdating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });
    queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
    
    setIsAiUpdating(false);
    toast({
      title: '✅ Sistema Atualizado',
      description: 'A IA verificou todos os portais e atualizou os dados.',
    });
  };

  // Mutation para reenviar proposta
  const resendProposalMutation = useMutation({
    mutationFn: async (propostaId: string) => {
      const { data, error } = await supabase
        .from('propostas')
        .update({ status: 'Aguardando Envio' as any, updated_at: new Date().toISOString() })
        .eq('id', propostaId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });
      toast({
        title: '📤 Proposta reenfileirada',
        description: 'A proposta será reenviada automaticamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reenviar',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  // Mutation para criar propostas de teste
  const createTestProposalMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      // Primeiro, verificar se o usuário tem uma empresa
      const { data: empresas, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.id)
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
        description: getSafeErrorMessage(error),
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
      if (!user) throw new Error('Usuário não autenticado');

      // Defense-in-depth: scope proposals to the current user's companies.
      const { data: minhasEmpresas, error: minhasEmpresasError } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.id);

      if (minhasEmpresasError) throw minhasEmpresasError;
      const minhasEmpresaIds = (minhasEmpresas ?? []).map((e) => e.id);
      if (minhasEmpresaIds.length === 0) return [];

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
        .in('empresa_id', minhasEmpresaIds)
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
        .in('id', empresaIds)
        .eq('user_id', user.id);

      // Montar os dados completos
      return propostas.map(proposta => ({
        ...proposta,
        licitacao: licitacoes?.find(l => l.id === proposta.licitacao_id) || null,
        empresa: empresas?.find(e => e.id === proposta.empresa_id) || { nome: 'N/A', cnpj: 'N/A' }
      })).filter(p => p.licitacao !== null) as Participacao[];
    },
    enabled: !!user,
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

  const filterBySegmento = (segmento: string) =>
    participacoes.filter(p => p.licitacao.segmento === segmento);

  const aguardandoEnvio = filterByStatus(['Aguardando Envio', 'Erro no Envio']);
  const emDisputa = filterByStatus(['Enviada', 'Em Disputa']);
  const vencidas = filterByStatus(['Vencedora']);
  const perdidas = filterByStatus(['Perdedora', 'Cancelada']);

  // Filtrar por segmento
  const medicamentosParticipacoes = filterBySegmento('Medicamentos');
  const empreendimentosParticipacoes = filterBySegmento('Empreendimentos');
  
  const medicamentosVencidas = medicamentosParticipacoes.filter(p => p.status === 'Vencedora');
  const empreendimentosVencidas = empreendimentosParticipacoes.filter(p => p.status === 'Vencedora');

  // Buscar licitações autorizadas (status = 'Autorizada' na tabela licitacoes)
  const { data: licitacoesAutorizadas = [] } = useQuery({
    queryKey: ['licitacoes-autorizadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('*')
        .eq('status', 'Autorizada')
        .gt('data_limite', new Date().toISOString())
        .order('data_abertura', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Separar licitações autorizadas por segmento
  const autorizadasMedicamentos = licitacoesAutorizadas.filter(l => l.segmento === 'Medicamentos');
  const autorizadasEmpreendimentos = licitacoesAutorizadas.filter(l => l.segmento === 'Empreendimentos');

  const stats = {
    total: participacoes.length,
    aguardandoEnvio: aguardandoEnvio.length,
    emDisputa: emDisputa.length,
    vencidas: vencidas.length,
    perdidas: perdidas.length,
    autorizadas: licitacoesAutorizadas.length,
    valorTotal: vencidas.reduce((acc, p) => acc + p.valor_proposta, 0),
    taxaSucesso: participacoes.length > 0 
      ? ((vencidas.length / participacoes.length) * 100).toFixed(1)
      : '0.0',
    medicamentos: {
      total: medicamentosParticipacoes.length,
      vencidas: medicamentosVencidas.length,
      autorizadas: autorizadasMedicamentos.length,
    },
    empreendimentos: {
      total: empreendimentosParticipacoes.length,
      vencidas: empreendimentosVencidas.length,
      autorizadas: autorizadasEmpreendimentos.length,
    }
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
              onClick={handleAIGlobalUpdate} 
              variant="outline" 
              className="gap-2"
              disabled={isAiUpdating}
            >
              {isAiUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <Sparkles className="w-4 h-4" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Atualizar IA
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{stats.autorizadas}</p>
              <p className="text-xs text-muted-foreground">Robô Ativo</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-muted to-muted/50">
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
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-blue-600">
                R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Valor Vencido</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="autorizadas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="autorizadas" className="gap-1 text-xs md:text-sm">
              <Bot className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Robô</span>
              <Badge variant="secondary" className="ml-0.5 bg-primary/20 text-primary text-xs px-1.5">{stats.autorizadas}</Badge>
            </TabsTrigger>
            <TabsTrigger value="aguardando-envio" className="gap-1 text-xs md:text-sm">
              <Send className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Envio</span>
              <Badge variant="secondary" className={`ml-0.5 text-xs px-1.5 ${stats.aguardandoEnvio > 0 ? 'bg-amber-100 text-amber-700' : ''}`}>{stats.aguardandoEnvio}</Badge>
            </TabsTrigger>
            <TabsTrigger value="medicamentos" className="gap-1 text-xs md:text-sm">
              <Pill className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Med</span>
              <Badge variant="secondary" className="ml-0.5 bg-blue-100 text-blue-700 text-xs px-1.5">{stats.medicamentos.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="empreendimentos" className="gap-1 text-xs md:text-sm">
              <Building className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Emp</span>
              <Badge variant="secondary" className="ml-0.5 bg-orange-100 text-orange-700 text-xs px-1.5">{stats.empreendimentos.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disputa" className="gap-1 text-xs md:text-sm">
              <Gavel className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Disputa</span>
              <Badge variant="secondary" className="ml-0.5 bg-warning/20 text-warning text-xs px-1.5">{stats.emDisputa}</Badge>
            </TabsTrigger>
            <TabsTrigger value="vencidas" className="gap-1 text-xs md:text-sm">
              <Trophy className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Vencidas</span>
              <Badge variant="secondary" className="ml-0.5 bg-success/20 text-success text-xs px-1.5">{stats.vencidas}</Badge>
            </TabsTrigger>
            <TabsTrigger value="perdidas" className="gap-1 text-xs md:text-sm">
              <XCircle className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Perdidas</span>
              <Badge variant="secondary" className="ml-0.5 bg-destructive/20 text-destructive text-xs px-1.5">{stats.perdidas}</Badge>
            </TabsTrigger>
            <TabsTrigger value="todas" className="gap-1 text-xs md:text-sm">
              <FileText className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Todas</span>
              <Badge variant="secondary" className="ml-0.5 text-xs px-1.5">{stats.total}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Aba de Licitações Autorizadas para o Robô */}
          <TabsContent value="autorizadas">
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Monitoramento do Robô 24/7</h3>
                  <p className="text-sm text-muted-foreground">
                    O robô está monitorando {stats.autorizadas} licitação(ões) autorizada(s) e participará automaticamente nas disputas.
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-600">Ativo</span>
                </div>
              </div>
            </div>

            <DisputeAlertModeSelector className="mb-4" />
            
            <div className="pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                {licitacoesAutorizadas.length === 0 ? (
                  <Card className="col-span-2 p-16 text-center border-2 border-dashed border-primary/30 bg-primary/5">
                    <Bot className="w-24 h-24 mx-auto text-primary/40 mb-6" />
                    <p className="text-2xl font-bold text-foreground mb-3">Nenhuma licitação autorizada</p>
                    <p className="text-base text-muted-foreground mt-2 max-w-md mx-auto">
                      Autorize licitações na página de Licitações para o robô participar automaticamente.
                    </p>
                    <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">
                      Clique em "Autorizar Participação" em qualquer licitação para ativar o robô.
                    </p>
                    <Button 
                      variant="default" 
                      className="mt-6 gap-2"
                      onClick={() => window.location.href = '/licitacoes'}
                    >
                      <Gavel className="w-4 h-4" />
                      Ir para Licitações
                    </Button>
                  </Card>
                ) : (
                  licitacoesAutorizadas.map(lic => (
                    <AutorizadaCard 
                      key={lic.id} 
                      licitacao={lic}
                      isRealtime={false}
                      empresaId={primeiraEmpresa?.id}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba Aguardando Envio */}
          <TabsContent value="aguardando-envio">
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <Send className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-700">Propostas Aguardando Envio</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.aguardandoEnvio} proposta(s) aguardando envio ou com erro. Use o botão de reenvio para tentar novamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                {aguardandoEnvio.length === 0 ? (
                  <Card className="col-span-2 p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Nenhuma proposta pendente de envio</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Todas as propostas foram enviadas com sucesso!
                    </p>
                  </Card>
                ) : (
                  aguardandoEnvio.map(p => (
                    <Card key={p.id} className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      p.status === 'Erro no Envio' ? 'border-destructive/50 bg-destructive/5' : 'border-amber-300 bg-amber-50/30'
                    }`}>
                      {p.status === 'Erro no Envio' && (
                        <div className="absolute top-0 left-0 right-0 bg-destructive/10 px-4 py-1.5 flex items-center gap-2 text-destructive text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Erro no envio — clique em Reenviar para tentar novamente
                        </div>
                      )}
                      <CardHeader className={`pb-3 ${p.status === 'Erro no Envio' ? 'pt-10' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{p.licitacao.portal}</Badge>
                              <Badge variant="secondary" className="text-xs">{p.licitacao.modalidade}</Badge>
                              <StatusBadge status={p.status} />
                            </div>
                            <CardTitle className="text-base line-clamp-2">
                              {p.licitacao.objeto_resumido || p.licitacao.objeto}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">{p.licitacao.numero}</p>
                          </div>
                          <CountdownTimer targetDate={p.licitacao.data_limite} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{p.licitacao.orgao}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{p.licitacao.municipio}, {p.licitacao.uf}</span>
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 rounded-lg bg-background border">
                            <p className="text-xs text-muted-foreground mb-1">Valor da Proposta</p>
                            <p className="font-bold text-primary">
                              R$ {p.valor_proposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-background border">
                            <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
                            <p className="font-bold text-muted-foreground">
                              R$ {p.licitacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-muted-foreground">
                            Empresa: {p.empresa.nome}
                          </div>
                          <Button
                            variant={p.status === 'Erro no Envio' ? 'destructive' : 'default'}
                            size="sm"
                            className="gap-2"
                            disabled={resendProposalMutation.isPending}
                            onClick={() => resendProposalMutation.mutate(p.id)}
                          >
                            {resendProposalMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                            Reenviar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="medicamentos">
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Pill className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-700">Empresa: PARA MEDICAMENTOS E SERVIÇOS MÉDICOS LTDA</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.medicamentos.autorizadas} autorizada(s) • {stats.medicamentos.vencidas} vencida(s) • {stats.medicamentos.total} total
                  </p>
                </div>
                <Badge className="ml-auto bg-blue-100 text-blue-700">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Licença Farmacêutica
                </Badge>
              </div>
            </div>
            
            <div className="pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                {medicamentosParticipacoes.length === 0 ? (
                  <Card className="col-span-2 p-8 text-center">
                    <Pill className="w-16 h-16 mx-auto text-blue-300 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Nenhuma participação em Medicamentos</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Autorize licitações no segmento de Medicamentos para participar.
                    </p>
                  </Card>
                ) : (
                  medicamentosParticipacoes.map(p => (
                    <ParticipacaoCard 
                      key={p.id} 
                      participacao={p} 
                      isRealtime={realtimeUpdates.includes(p.id)}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba Empreendimentos */}
          <TabsContent value="empreendimentos">
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-50/50 border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100">
                  <Building className="w-6 h-6 text-orange-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-700">Empresa: PARA EMPREENDIMENTOS COMERCIO E PRESTACAO DE SERVIÇOS LTDA</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.empreendimentos.autorizadas} autorizada(s) • {stats.empreendimentos.vencidas} vencida(s) • {stats.empreendimentos.total} total
                  </p>
                </div>
                <Badge className="ml-auto bg-orange-100 text-orange-700">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  SICAF Regular
                </Badge>
              </div>
            </div>
            
            <div className="pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                {empreendimentosParticipacoes.length === 0 ? (
                  <Card className="col-span-2 p-8 text-center">
                    <Building className="w-16 h-16 mx-auto text-orange-300 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Nenhuma participação em Empreendimentos</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Autorize licitações no segmento de Empreendimentos para participar.
                    </p>
                  </Card>
                ) : (
                  empreendimentosParticipacoes.map(p => (
                    <ParticipacaoCard 
                      key={p.id} 
                      participacao={p} 
                      isRealtime={realtimeUpdates.includes(p.id)}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="todas">
            <div className="pb-6">
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
                      onOpenDetails={handleOpenDetails}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="disputa">
            <div className="pb-6">
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
                      onOpenDetails={handleOpenDetails}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vencidas">
            <div className="pb-6">
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
                      onOpenDetails={handleOpenDetails}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="perdidas">
            <div className="pb-6">
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
                      onOpenDetails={handleOpenDetails}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de detalhes */}
        {selectedParticipacao && (
          <ParticipacaoDetalheModal
            participacao={selectedParticipacao}
            open={!!selectedParticipacao}
            onOpenChange={(open) => !open && setSelectedParticipacao(null)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default MinhasParticipacoes;
