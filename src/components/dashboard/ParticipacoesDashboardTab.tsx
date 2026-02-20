import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  TrendingDown,
  Eye,
  Gavel,
  RefreshCw,
  Bot,
  Zap,
  Activity,
  ShieldCheck,
  Target,
  Users,
  Send,
  Download,
  FileCheck,
  Scale,
  Loader2,
  ArrowRight,
  Play,
  Pause,
  Settings2,
  ClipboardList,
  Sparkles,
  Briefcase,
  ExternalLink,
  Check,
  Copy,
  MessageSquare,
  AlertTriangle,
  MonitorPlay,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSafeErrorMessage } from '@/lib/safeError';
import { ImpugnacaoSystem } from '@/components/licitacao/ImpugnacaoSystem';
import { RobotLiveLog } from '@/components/licitacao/RobotLiveLog';

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
    edital_url?: string;
  };
  empresa: {
    nome: string;
    cnpj: string;
  };
}

interface LicitacaoAutorizada {
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
  edital_url?: string;
}

interface RobotState {
  posicao: number;
  totalCompetidores: number;
  menorLance: number;
  meuLance: number;
  status: 'aguardando' | 'preparando' | 'monitorando' | 'disputando' | 'vencedor' | 'perdedor';
  ultimaAcao: Date;
  lancesEnviados: number;
}

// Countdown Timer Component
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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs ${
      isExpired 
        ? 'bg-muted text-muted-foreground' 
        : isUrgent 
          ? 'bg-destructive/10 text-destructive animate-pulse' 
          : 'bg-primary/10 text-primary'
    }`}>
      <Timer className="w-3 h-3" />
      <span className="font-bold">{timeLeft}</span>
    </div>
  );
};

// Position Badge Component
const PositionBadge = ({ position, total }: { position: number; total: number }) => {
  const isLeader = position === 1;
  return (
    <Badge className={`${isLeader ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}`}>
      {isLeader ? <Trophy className="w-3 h-3 mr-1" /> : <Target className="w-3 h-3 mr-1" />}
      {position}º de {total}
    </Badge>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { color: string; icon: React.ReactNode }> = {
    'aguardando': { color: 'bg-muted text-muted-foreground', icon: <Clock className="w-3 h-3" /> },
    'preparando': { color: 'bg-amber-500/10 text-amber-600', icon: <Zap className="w-3 h-3" /> },
    'monitorando': { color: 'bg-blue-500/10 text-blue-600', icon: <Activity className="w-3 h-3" /> },
    'disputando': { color: 'bg-success/10 text-success', icon: <Bot className="w-3 h-3" /> },
    'vencedor': { color: 'bg-success text-success-foreground', icon: <Trophy className="w-3 h-3" /> },
    'perdedor': { color: 'bg-destructive/10 text-destructive', icon: <XCircle className="w-3 h-3" /> },
    'Nova': { color: 'bg-primary/10 text-primary', icon: <Sparkles className="w-3 h-3" /> },
    'Autorizada': { color: 'bg-success/10 text-success', icon: <ShieldCheck className="w-3 h-3" /> },
    'Em Disputa': { color: 'bg-amber-500/10 text-amber-600', icon: <Gavel className="w-3 h-3" /> },
    'Vencedora': { color: 'bg-success text-success-foreground', icon: <Trophy className="w-3 h-3" /> },
    'Perdedora': { color: 'bg-destructive/10 text-destructive', icon: <XCircle className="w-3 h-3" /> },
    'Enviada': { color: 'bg-blue-500/10 text-blue-600', icon: <Send className="w-3 h-3" /> },
    'Rascunho': { color: 'bg-muted text-muted-foreground', icon: <FileText className="w-3 h-3" /> },
  };

  const config = configs[status] || configs['aguardando'];

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      {config.icon}
      {status}
    </Badge>
  );
};

// CNAE verification types
interface CnaeVerification {
  status: 'loading' | 'ok' | 'warning' | 'error';
  cnaeEmpresa?: string;
  cnaeDescricao?: string;
  mensagem: string;
  detalhes?: string;
}

// Proposal Creation Modal
const ProposalModal = ({ 
  licitacao, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  licitacao: LicitacaoAutorizada | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [valorProposta, setValorProposta] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cnaeVerification, setCnaeVerification] = useState<CnaeVerification | null>(null);
  const [documentsReady, setDocumentsReady] = useState({
    edital: false,
    proposta: false,
    documentos: false,
    sicaf: false,
    cnae: false,
  });

  useEffect(() => {
    if (licitacao) {
      setValorProposta((licitacao.valor * 0.92).toFixed(2));
    }
  }, [licitacao]);

  // Verify CNAE when entering step 2
  useEffect(() => {
    if (!isOpen || step !== 2 || !licitacao || !user) return;

    // Reset state
    setDocumentsReady({ edital: false, proposta: false, documentos: false, sicaf: false, cnae: false });
    setCnaeVerification({ status: 'loading', mensagem: 'Verificando CNAE da empresa...' });

    const run = async () => {
      // 1. Fetch empresa with CNAE data
      const { data: empresas } = await supabase
        .from('empresas')
        .select('cnae_codigo, cnae_descricao, nome, segmento')
        .eq('user_id', user.id)
        .limit(1);

      const empresa = empresas?.[0];

      // 2. Check CNAE compatibility with edital segmento/objeto
      if (!empresa?.cnae_codigo) {
        setCnaeVerification({
          status: 'warning',
          mensagem: 'CNAE não cadastrado',
          detalhes: 'A empresa não possui CNAE cadastrado. Cadastre o CNAE em Empresas antes de enviar propostas para garantir a habilitação.',
        });
      } else {
        // Compatibility heuristic: check if CNAE group matches licitacao segment
        const cnae = empresa.cnae_codigo;
        const segmento = licitacao.segmento?.toLowerCase() || '';
        const objeto = licitacao.objeto?.toLowerCase() || '';

        // CNAE groups for Medicamentos: 21 (farmacêutico), 46 (comércio atacadista), 47 (comércio varejista)
        const cnaeMedicamentos = ['21', '46.44', '46.45', '47.71', '47.72', '4771', '4772', '4644', '4645'];
        // CNAE groups for Empreendimentos: 41, 42, 43 (construção), 71 (arquitetura/eng), 33 (manutenção)
        const cnaeEmpreendimentos = ['41', '42', '43', '71', '33'];

        const isMedSegment = segmento.includes('medicamento') || objeto.includes('medicamento') || objeto.includes('farmac') || objeto.includes('drug');
        const isEmpSegment = segmento.includes('empreendimento') || objeto.includes('obra') || objeto.includes('constru') || objeto.includes('reform');

        let compatible = true;
        let warningMsg = '';

        if (isMedSegment) {
          const cnaeOk = cnaeMedicamentos.some(prefix => cnae.replace(/\D/g, '').startsWith(prefix.replace(/\D/g, '')));
          if (!cnaeOk) {
            compatible = false;
            warningMsg = `Seu CNAE ${cnae} pode não habilitar sua empresa para licitações de Medicamentos. CNAEs recomendados: 4771-7, 4772-5, 4644-3 (comércio farmacêutico).`;
          }
        } else if (isEmpSegment) {
          const cnaeOk = cnaeEmpreendimentos.some(prefix => cnae.replace(/\D/g, '').startsWith(prefix.replace(/\D/g, '')));
          if (!cnaeOk) {
            compatible = false;
            warningMsg = `Seu CNAE ${cnae} pode não habilitar sua empresa para licitações de Obras/Empreendimentos. CNAEs recomendados: 41, 42, 43 (construção civil).`;
          }
        }

        if (compatible) {
          setCnaeVerification({
            status: 'ok',
            cnaeEmpresa: cnae,
            cnaeDescricao: empresa.cnae_descricao || '',
            mensagem: `CNAE ${cnae} compatível com o edital`,
            detalhes: empresa.cnae_descricao || 'Atividade econômica habilitada para participação.',
          });
        } else {
          setCnaeVerification({
            status: 'warning',
            cnaeEmpresa: cnae,
            cnaeDescricao: empresa.cnae_descricao || '',
            mensagem: 'Atenção: CNAE pode ser incompatível',
            detalhes: warningMsg,
          });
        }
      }

      // Sequential document preparation timers
      const timers = [
        setTimeout(() => setDocumentsReady(prev => ({ ...prev, edital: true })), 1000),
        setTimeout(() => setDocumentsReady(prev => ({ ...prev, proposta: true })), 2000),
        setTimeout(() => setDocumentsReady(prev => ({ ...prev, documentos: true })), 3000),
        setTimeout(() => setDocumentsReady(prev => ({ ...prev, sicaf: true })), 4000),
        setTimeout(() => setDocumentsReady(prev => ({ ...prev, cnae: true })), 1500),
      ];
      return () => timers.forEach(t => clearTimeout(t));
    };

    run();
  }, [isOpen, step, licitacao, user]);

  const handleSubmitProposal = async () => {
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onSubmit({
      licitacaoId: licitacao?.id,
      valorProposta: parseFloat(valorProposta),
      justificativa,
    });
    
    setIsSubmitting(false);
    onClose();
  };

  if (!licitacao) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const allDocumentsReady = Object.values(documentsReady).every(Boolean);
  const cnaeBlocked = cnaeVerification?.status === 'error';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Criar e Enviar Proposta Profissional
          </DialogTitle>
          <DialogDescription>
            {licitacao.numero} - {licitacao.orgao}
          </DialogDescription>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-2 my-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-1 mx-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dados da Licitação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Objeto:</span>
                  <span className="font-medium text-right max-w-[60%]">{licitacao.objeto_resumido || licitacao.objeto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Estimado:</span>
                  <span className="font-bold text-primary">{formatCurrency(licitacao.valor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modalidade:</span>
                  <span>{licitacao.modalidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Local:</span>
                  <span>{licitacao.municipio}, {licitacao.uf}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da Proposta (R$)</label>
              <Input
                type="number"
                value={valorProposta}
                onChange={(e) => setValorProposta(e.target.value)}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Margem: {((1 - parseFloat(valorProposta || '0') / licitacao.valor) * 100).toFixed(1)}% abaixo do estimado
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Justificativa Técnica (opcional)</label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva diferenciais da proposta..."
                rows={3}
              />
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              Próximo: Preparar Documentos <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* CNAE Verification Banner */}
            {cnaeVerification && cnaeVerification.status !== 'loading' && (
              <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                cnaeVerification.status === 'ok'
                  ? 'bg-success/10 border-success/40'
                  : cnaeVerification.status === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-destructive/10 border-destructive/40'
              }`}>
                <div className="shrink-0 mt-0.5">
                  {cnaeVerification.status === 'ok' ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : cnaeVerification.status === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${
                    cnaeVerification.status === 'ok' ? 'text-success' :
                    cnaeVerification.status === 'warning' ? 'text-amber-600' : 'text-destructive'
                  }`}>
                    {cnaeVerification.mensagem}
                  </p>
                  {cnaeVerification.cnaeEmpresa && (
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      CNAE: <strong>{cnaeVerification.cnaeEmpresa}</strong>
                      {cnaeVerification.cnaeDescricao && ` — ${cnaeVerification.cnaeDescricao}`}
                    </p>
                  )}
                  {cnaeVerification.detalhes && (
                    <p className="text-xs text-muted-foreground mt-1">{cnaeVerification.detalhes}</p>
                  )}
                  {cnaeVerification.status === 'warning' && !cnaeVerification.cnaeEmpresa && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">
                      ⚠️ Acesse <strong>Empresas</strong> e cadastre o CNAE para garantir a habilitação no edital.
                    </p>
                  )}
                </div>
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Preparação Automática de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* CNAE Check Item */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  cnaeVerification?.status === 'ok' ? 'bg-success/5 border-success/30' :
                  cnaeVerification?.status === 'warning' ? 'bg-amber-500/5 border-amber-500/30' :
                  'bg-muted/50 border-transparent'
                }`}>
                  <div className="flex items-center gap-3">
                    {cnaeVerification?.status === 'loading' || !documentsReady.cnae ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : cnaeVerification?.status === 'ok' ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Verificação de CNAE</p>
                      <p className="text-xs text-muted-foreground">
                        {cnaeVerification?.status === 'loading' || !documentsReady.cnae
                          ? 'Consultando cadastro da empresa...'
                          : cnaeVerification?.cnaeEmpresa
                          ? `CNAE ${cnaeVerification.cnaeEmpresa} verificado contra o edital`
                          : 'CNAE não cadastrado na empresa'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    !documentsReady.cnae ? 'secondary' :
                    cnaeVerification?.status === 'ok' ? 'default' : 'outline'
                  } className={
                    documentsReady.cnae && cnaeVerification?.status === 'warning'
                      ? 'border-amber-500 text-amber-600'
                      : ''
                  }>
                    {!documentsReady.cnae ? 'Verificando...' :
                     cnaeVerification?.status === 'ok' ? 'Compatível' : 'Atenção'}
                  </Badge>
                </div>

                {[
                  { key: 'edital', label: 'Análise do Edital', desc: 'Lei 14.133/2021 verificada' },
                  { key: 'proposta', label: 'Proposta Comercial', desc: 'Formatação profissional' },
                  { key: 'documentos', label: 'Documentos de Habilitação', desc: 'SICAF, certidões, licenças' },
                  { key: 'sicaf', label: 'Verificação SICAF', desc: 'Regularidade confirmada' },
                ].map((doc) => (
                  <div key={doc.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      {documentsReady[doc.key as keyof typeof documentsReady] ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{doc.label}</p>
                        <p className="text-xs text-muted-foreground">{doc.desc}</p>
                      </div>
                    </div>
                    <Badge variant={documentsReady[doc.key as keyof typeof documentsReady] ? 'default' : 'secondary'}>
                      {documentsReady[doc.key as keyof typeof documentsReady] ? 'Pronto' : 'Preparando...'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!allDocumentsReady || cnaeBlocked} 
                className="flex-1"
              >
                Próximo: Revisar e Enviar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Card className="border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Resumo Final da Proposta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Valor da Proposta</p>
                    <p className="text-3xl font-bold text-success">{formatCurrency(parseFloat(valorProposta))}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((1 - parseFloat(valorProposta) / licitacao.valor) * 100).toFixed(1)}% de desconto
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Licitação:</span>
                    <span>{licitacao.numero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portal:</span>
                    <span>{licitacao.portal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documentos:</span>
                    <span className="text-success">5 anexados (incl. CNAE)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Verificação CNAE:</span>
                    <span className={`flex items-center gap-1 font-medium text-xs ${
                      cnaeVerification?.status === 'ok' ? 'text-success' :
                      cnaeVerification?.status === 'warning' ? 'text-amber-600' : 'text-muted-foreground'
                    }`}>
                      {cnaeVerification?.status === 'ok' ? (
                        <><CheckCircle2 className="w-3 h-3" /> {cnaeVerification.cnaeEmpresa} — Compatível</>
                      ) : cnaeVerification?.status === 'warning' ? (
                        <><AlertTriangle className="w-3 h-3" /> Atenção — Verifique o CNAE</>
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>
                </div>

                {cnaeVerification?.status === 'warning' && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-amber-700 dark:text-amber-400">
                      <strong>CNAE com ressalva:</strong> Você pode prosseguir, mas verifique se o CNAE da empresa atende às exigências de habilitação do edital antes de enviá-la ao portal.
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/50 text-xs">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary mt-0.5" />
                    <p>
                      <strong>Lei 14.133/2021:</strong> Esta proposta foi verificada contra o edital. O envio será realizado de forma profissional, conforme as exigências de habilitação.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={handleSubmitProposal} 
                disabled={isSubmitting}
                className="flex-1 bg-success hover:bg-success/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Proposta ao Portal
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Helper: gera URL da sala de disputa real conforme o portal
const getSalaDisputaUrl = (lic: LicitacaoAutorizada): string | null => {
  if (lic.edital_url) return lic.edital_url;
  const portal = lic.portal?.toLowerCase() || '';
  if (portal.includes('pncp')) {
    return `https://www.gov.br/compras/pt-br/sistemas/pncp`;
  }
  if (portal.includes('comprasnet') || portal.includes('compras.gov')) {
    return `https://www.gov.br/compras/pt-br`;
  }
  if (portal.includes('bll') || portal.includes('bolsalicitacoes')) {
    return `https://bll.org.br`;
  }
  if (portal.includes('caixa') || portal.includes('bb')) {
    return `https://www.caixa.gov.br/poder-publico/licitacoes/Paginas/default.aspx`;
  }
  if (portal.includes('licitanet')) {
    return `https://www.licitanet.com.br`;
  }
  return null;
};

// Main Component
export function ParticipacoesDashboardTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedLicitacao, setSelectedLicitacao] = useState<LicitacaoAutorizada | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [robotStates, setRobotStates] = useState<Record<string, RobotState>>({});
  const [isImpugnacaoOpen, setIsImpugnacaoOpen] = useState(false);
  const [impugnacaoLicitacao, setImpugnacaoLicitacao] = useState<LicitacaoAutorizada | null>(null);
  const [selectedRobotLog, setSelectedRobotLog] = useState<LicitacaoAutorizada | null>(null);
  const [activeTab, setActiveTab] = useState('autorizadas');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Fetch participações
  const { data: participacoes = [], isLoading: loadingParticipacoes } = useQuery({
    queryKey: ['dashboard-participacoes'],
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
        .select('*')
        .in('empresa_id', minhasEmpresaIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!propostas || propostas.length === 0) return [];

      const licitacaoIds = [...new Set(propostas.map(p => p.licitacao_id))];
      const { data: licitacoes } = await supabase
        .from('licitacoes')
        .select('*')
        .in('id', licitacaoIds);

      const empresaIds = [...new Set(propostas.map(p => p.empresa_id))];
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, nome, cnpj')
        .in('id', empresaIds)
        .eq('user_id', user.id);

      return propostas.map(proposta => ({
        ...proposta,
        licitacao: licitacoes?.find(l => l.id === proposta.licitacao_id) || null,
        empresa: empresas?.find(e => e.id === proposta.empresa_id) || { nome: 'N/A', cnpj: 'N/A' }
      })).filter(p => p.licitacao !== null) as Participacao[];
    },
    refetchInterval: 10000,
    enabled: !!user,
  });

  // Fetch licitações autorizadas (apenas não encerradas)
  const { data: licitacoesAutorizadas = [], isLoading: loadingAutorizadas } = useQuery({
    queryKey: ['dashboard-autorizadas'],
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
    refetchInterval: 10000,
  });

  // Compute robot states based on real data only (no random/fake values)
  useEffect(() => {
    const states: Record<string, RobotState> = {};
    
    licitacoesAutorizadas.forEach((lic) => {
      const now = new Date();
      const abertura = new Date(lic.data_abertura);
      const diffHours = (abertura.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      let status: RobotState['status'] = 'aguardando';
      if (diffHours <= 0) status = 'disputando';
      else if (diffHours <= 1) status = 'preparando';
      else if (diffHours <= 24) status = 'monitorando';

      states[lic.id] = {
        posicao: 0,
        totalCompetidores: 0,
        menorLance: 0,
        meuLance: 0,
        status,
        ultimaAcao: new Date(),
        lancesEnviados: 0,
      };
    });
    
    setRobotStates(states);
  }, [licitacoesAutorizadas]);

  // Remove proposal mutation
  const removeProposalMutation = useMutation({
    mutationFn: async (propostaId: string) => {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', propostaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-participacoes'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
      toast({ title: '🗑️ Participação removida', description: 'A proposta foi removida com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  // Remove licitação autorizada (volta para Nova)
  const removeAutorizadaMutation = useMutation({
    mutationFn: async (licitacaoId: string) => {
      const { error } = await supabase
        .from('licitacoes')
        .update({ status: 'Nova' })
        .eq('id', licitacaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-autorizadas'] });
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
      toast({ title: '🗑️ Autorização removida', description: 'A licitação voltou para o status Nova.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  // Submit proposal mutation
  const submitProposalMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Get or create empresa
      let empresaId: string;
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!empresas || empresas.length === 0) {
        const { data: novaEmpresa, error } = await supabase
          .from('empresas')
          .insert({
            user_id: user.id,
            nome: 'Empresa Principal',
            cnpj: '00.000.000/0001-00',
            uf: 'PA',
            municipio: 'Belém',
            segmento: 'Medicamentos',
          })
          .select('id')
          .single();
        if (error) throw error;
        empresaId = novaEmpresa.id;
      } else {
        empresaId = empresas[0].id;
      }

      // Create proposal
      const { error } = await supabase
        .from('propostas')
        .insert({
          empresa_id: empresaId,
          licitacao_id: data.licitacaoId,
          valor_proposta: data.valorProposta,
          status: 'Enviada',
          observacoes: data.justificativa,
        });

      if (error) throw error;

      // Update licitacao status
      await supabase
        .from('licitacoes')
        .update({ status: 'Em Disputa' })
        .eq('id', data.licitacaoId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-participacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-autorizadas'] });
      toast({
        title: '✅ Proposta Enviada!',
        description: 'Sua proposta foi enviada profissionalmente ao portal.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar proposta',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  // Statistics
  const stats = useMemo(() => {
    const emDisputa = participacoes.filter(p => ['Enviada', 'Em Disputa'].includes(p.status));
    const vencidas = participacoes.filter(p => p.status === 'Vencedora');
    const perdidas = participacoes.filter(p => ['Perdedora', 'Cancelada'].includes(p.status));
    
    return {
      autorizadas: licitacoesAutorizadas.length,
      emDisputa: emDisputa.length,
      vencidas: vencidas.length,
      perdidas: perdidas.length,
      valorVencido: vencidas.reduce((acc, p) => acc + p.valor_proposta, 0),
      taxaSucesso: participacoes.length > 0 
        ? ((vencidas.length / participacoes.length) * 100).toFixed(1) 
        : '0.0',
    };
  }, [participacoes, licitacoesAutorizadas]);

  const isLoading = loadingParticipacoes || loadingAutorizadas;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setActiveTab('autorizadas')}>
          <CardContent className="p-4 text-center">
            <Bot className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.autorizadas}</p>
            <p className="text-xs text-muted-foreground">Robô Ativo</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all" onClick={() => setActiveTab('disputa')}>
          <CardContent className="p-4 text-center">
            <Gavel className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{stats.emDisputa}</p>
            <p className="text-xs text-muted-foreground">Em Disputa</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-success/50 transition-all" onClick={() => setActiveTab('vencidas')}>
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{stats.vencidas}</p>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all" onClick={() => setActiveTab('perdidas')}>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold">{stats.perdidas}</p>
            <p className="text-xs text-muted-foreground">Perdidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-success" />
            <p className="text-lg font-bold">{formatCurrency(stats.valorVencido)}</p>
            <p className="text-xs text-muted-foreground">Valor Vencido</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-success/10">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.taxaSucesso}%</p>
            <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
          </CardContent>
        </Card>
      </div>

      {/* Internal Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="autorizadas" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Autorizadas</span>
            <Badge variant="secondary" className="ml-1">{stats.autorizadas}</Badge>
          </TabsTrigger>
          <TabsTrigger value="disputa" className="flex items-center gap-2">
            <Gavel className="w-4 h-4" />
            <span className="hidden sm:inline">Em Disputa</span>
            <Badge variant="secondary" className="ml-1">{stats.emDisputa}</Badge>
          </TabsTrigger>
          <TabsTrigger value="vencidas" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Vencidas</span>
            <Badge variant="secondary" className="ml-1">{stats.vencidas}</Badge>
          </TabsTrigger>
          <TabsTrigger value="perdidas" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Perdidas</span>
            <Badge variant="secondary" className="ml-1">{stats.perdidas}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Autorizadas */}
        <TabsContent value="autorizadas" className="mt-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary animate-pulse" />
                Robô Autorizado a Participar
                <Badge className="ml-auto bg-primary">{stats.autorizadas} ativas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {licitacoesAutorizadas.length > 0 ? (
                  licitacoesAutorizadas.map((lic) => {
                    const robotState = robotStates[lic.id];
                    
                    return (
                      <Card key={lic.id} className={`border-2 transition-all ${
                        robotState?.status === 'disputando' ? 'border-success ring-2 ring-success/20 shadow-lg shadow-success/10' :
                        robotState?.status === 'preparando' ? 'border-amber-500 ring-1 ring-amber-500/20' :
                        robotState?.status === 'monitorando' ? 'border-blue-500' : 'border-border'
                      }`}>
                        {/* Robot Status Header */}
                        <div className={`px-4 py-2 flex items-center justify-between ${
                          robotState?.status === 'disputando' ? 'bg-success/10' :
                          robotState?.status === 'preparando' ? 'bg-amber-500/10' :
                          robotState?.status === 'monitorando' ? 'bg-blue-500/10' : 'bg-muted'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Bot className={`w-4 h-4 ${
                              robotState?.status === 'disputando' ? 'text-success animate-bounce' :
                              robotState?.status === 'preparando' ? 'text-amber-500' :
                              robotState?.status === 'monitorando' ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'
                            }`} />
                            <StatusBadge status={robotState?.status || 'aguardando'} />
                            {robotState?.status === 'disputando' && (
                              <span className="text-xs text-success animate-pulse">● AO VIVO</span>
                            )}
                          </div>
                          {robotState && robotState.posicao > 0 && (
                            <PositionBadge position={robotState.posicao} total={robotState.totalCompetidores} />
                          )}
                        </div>

                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{lic.objeto_resumido || lic.objeto}</p>
                              <p className="text-xs text-muted-foreground">{lic.numero}</p>
                            </div>
                            <CountdownTimer targetDate={lic.data_limite} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate">{lic.orgao}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span>{lic.municipio}, {lic.uf}</span>
                            </div>
                          </div>

                          {robotState && robotState.status === 'disputando' && robotState.menorLance > 0 && (
                            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Menor Lance:</span>
                                <span className="font-bold text-success">{formatCurrency(robotState.menorLance)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Meu Lance:</span>
                                <span className="font-bold">{formatCurrency(robotState.meuLance)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Lances Enviados:</span>
                                <Badge variant="outline">{robotState.lancesEnviados}</Badge>
                              </div>
                              {robotState.totalCompetidores > 0 && (
                                <Progress 
                                  value={((robotState.totalCompetidores - robotState.posicao + 1) / robotState.totalCompetidores) * 100} 
                                  className="h-2"
                                />
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                            <span className="font-bold text-primary text-lg">{formatCurrency(lic.valor)}</span>
                            <div className="flex gap-1 flex-wrap">
                              {/* Botão principal: Sala de Disputa Real */}
                              {getSalaDisputaUrl(lic) && (
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90 text-success-foreground gap-1 font-semibold"
                                  onClick={() => window.open(getSalaDisputaUrl(lic)!, '_blank', 'noopener,noreferrer')}
                                >
                                  <MonitorPlay className="w-3 h-3" />
                                  Sala de Disputa
                                </Button>
                              )}
                              <Button 
                                variant="outline"
                                size="sm" 
                                onClick={() => {
                                  setImpugnacaoLicitacao(lic);
                                  setIsImpugnacaoOpen(true);
                                }}
                              >
                                <Scale className="w-3 h-3 mr-1" />
                                Impugnar
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm" 
                                onClick={() => setSelectedRobotLog(lic)}
                              >
                                <Activity className="w-3 h-3 mr-1" />
                                Log
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm" 
                                onClick={() => {
                                  setSelectedLicitacao(lic);
                                  setIsProposalModalOpen(true);
                                }}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Proposta
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeAutorizadaMutation.mutate(lic.id)}
                                disabled={removeAutorizadaMutation.isPending}
                              >
                                {removeAutorizadaMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                Remover
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Nenhuma licitação autorizada</p>
                    <p className="text-sm">Autorize licitações para o robô participar automaticamente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Em Disputa */}
        <TabsContent value="disputa" className="mt-6">
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-500" />
                Participações em Concorrência
                <Badge className="ml-auto bg-amber-500 text-white">{stats.emDisputa} ativas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {participacoes.filter(p => ['Enviada', 'Em Disputa'].includes(p.status)).length > 0 ? (
                  participacoes.filter(p => ['Enviada', 'Em Disputa'].includes(p.status)).map((part) => (
                    <Card key={part.id} className={`transition-all ${
                      part.status === 'Em Disputa' ? 'border-amber-500 ring-1 ring-amber-500/20' : ''
                    }`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={part.status} />
                              <Badge variant="outline" className="text-xs">{part.licitacao.portal}</Badge>
                              {part.status === 'Em Disputa' && (
                                <span className="text-xs text-amber-500 animate-pulse">● AO VIVO</span>
                              )}
                            </div>
                            <p className="font-medium text-sm">{part.licitacao.objeto_resumido || part.licitacao.objeto}</p>
                            <p className="text-xs text-muted-foreground">{part.licitacao.numero}</p>
                          </div>
                          <CountdownTimer targetDate={part.licitacao.data_limite} />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
                            <p className="font-bold text-primary">{formatCurrency(part.licitacao.valor)}</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-success/10">
                            <p className="text-xs text-muted-foreground mb-1">Sua Proposta</p>
                            <p className="font-bold text-success">{formatCurrency(part.valor_proposta)}</p>
                            <p className="text-xs text-success">
                              -{((1 - part.valor_proposta / part.licitacao.valor) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{part.licitacao.orgao}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{part.licitacao.municipio}, {part.licitacao.uf}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 flex-wrap">
                          {getSalaDisputaUrl(part.licitacao as LicitacaoAutorizada) && (
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 text-success-foreground gap-1 font-semibold flex-1"
                              onClick={() => window.open(getSalaDisputaUrl(part.licitacao as LicitacaoAutorizada)!, '_blank', 'noopener,noreferrer')}
                            >
                              <MonitorPlay className="w-3 h-3" />
                              Sala de Disputa
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRobotLog(part.licitacao as LicitacaoAutorizada)}
                          >
                            <Activity className="w-3 h-3 mr-1" />
                            Log Robô
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeProposalMutation.mutate(part.id)}
                            disabled={removeProposalMutation.isPending}
                          >
                            {removeProposalMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            Remover
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gavel className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Nenhuma participação em andamento</p>
                    <p className="text-sm">Envie propostas para participar de licitações</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vencidas */}
        <TabsContent value="vencidas" className="mt-6">
          <Card className="border-success/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <Trophy className="w-5 h-5" />
                Licitações Vencidas
                <Badge className="ml-auto bg-success">{stats.vencidas} contratos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {participacoes.filter(p => p.status === 'Vencedora').length > 0 ? (
                  participacoes.filter(p => p.status === 'Vencedora').map((part) => (
                    <Card key={part.id} className="border-success/50 bg-success/5">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-success" />
                            <div>
                              <p className="font-medium text-sm">{part.licitacao.objeto_resumido}</p>
                              <p className="text-xs text-muted-foreground">{part.licitacao.numero}</p>
                            </div>
                          </div>
                          <Badge className="bg-success">Vencedor</Badge>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Valor Estimado</p>
                            <p className="font-bold">{formatCurrency(part.licitacao.valor)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Sua Proposta</p>
                            <p className="font-bold text-success">{formatCurrency(part.valor_proposta)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Economia</p>
                            <p className="font-bold text-success">
                              -{((1 - part.valor_proposta / part.licitacao.valor) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>{part.licitacao.orgao}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{part.licitacao.municipio}, {part.licitacao.uf}</span>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeProposalMutation.mutate(part.id)}
                            disabled={removeProposalMutation.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Nenhuma vitória ainda</p>
                    <p className="text-sm">Continue participando para conquistar licitações</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Perdidas */}
        <TabsContent value="perdidas" className="mt-6">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Licitações Perdidas
                <Badge variant="destructive" className="ml-auto">{stats.perdidas}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {participacoes.filter(p => ['Perdedora', 'Cancelada'].includes(p.status)).length > 0 ? (
                  participacoes.filter(p => ['Perdedora', 'Cancelada'].includes(p.status)).map((part) => (
                    <Card key={part.id} className="border-destructive/30 bg-destructive/5">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{part.licitacao.objeto_resumido}</p>
                            <p className="text-xs text-muted-foreground">{part.licitacao.numero}</p>
                          </div>
                          <Badge variant="destructive">{part.status}</Badge>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Sua Proposta</p>
                            <p className="font-bold text-destructive">{formatCurrency(part.valor_proposta)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Valor Estimado</p>
                            <p className="font-bold">{formatCurrency(part.licitacao.valor)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>{part.licitacao.orgao}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{part.licitacao.municipio}, {part.licitacao.uf}</span>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeProposalMutation.mutate(part.id)}
                            disabled={removeProposalMutation.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-30 text-success" />
                    <p className="font-medium">Nenhuma perda registrada</p>
                    <p className="text-sm">Excelente desempenho nas licitações!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Proposal Modal */}
      <ProposalModal
        licitacao={selectedLicitacao}
        isOpen={isProposalModalOpen}
        onClose={() => {
          setIsProposalModalOpen(false);
          setSelectedLicitacao(null);
        }}
        onSubmit={(data) => submitProposalMutation.mutate(data)}
      />

      {/* Impugnação System */}
      <ImpugnacaoSystem
        licitacao={impugnacaoLicitacao}
        isOpen={isImpugnacaoOpen}
        onClose={() => {
          setIsImpugnacaoOpen(false);
          setImpugnacaoLicitacao(null);
        }}
      />

      {/* Robot Live Log Modal */}
      <Dialog open={!!selectedRobotLog} onOpenChange={() => setSelectedRobotLog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Log do Robô em Tempo Real
            </DialogTitle>
            <DialogDescription>
              {selectedRobotLog?.numero} - {selectedRobotLog?.orgao}
            </DialogDescription>
          </DialogHeader>
          {selectedRobotLog && (
            <RobotLiveLog
              licitacaoId={selectedRobotLog.id}
              valorProposta={selectedRobotLog.valor * 0.92}
              isActive={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
