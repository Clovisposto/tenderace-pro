import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  FileText, 
  ExternalLink,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calculator,
  Percent,
  Truck,
  ShieldCheck,
  Zap,
  Link as LinkIcon,
  Globe,
  Scale,
  FileCheck,
  Download,
  Timer,
  Copy,
  X,
  Info,
  Gavel,
  Shield,
  Package,
  CreditCard,
  CalendarClock,
  ClipboardList,
  ListChecks,
  Banknote,
  Target,
  Bot
} from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AutorizacaoConfirmDialog } from './AutorizacaoConfirmDialog';
import type { Licitacao } from '@/hooks/useLicitacoes';

interface BLLDetailPanelProps {
  licitacao: Licitacao | null;
  onClose: () => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  'Nova': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Em Análise': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Aguardando Autorização': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Autorizada': { bg: 'bg-green-100', text: 'text-green-800' },
  'Em Disputa': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Vencida': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'Perdida': { bg: 'bg-red-100', text: 'text-red-800' },
  'Cancelada': { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export function BLLDetailPanel({ licitacao, onClose }: BLLDetailPanelProps) {
  const [precoFinal, setPrecoFinal] = useState(0);
  const [showAutorizacao, setShowAutorizacao] = useState(false);
  const queryClient = useQueryClient();

  // Mutation to authorize participation - MUST be before early return
  const autorizarMutation = useMutation({
    mutationFn: async () => {
      if (!licitacao) throw new Error('Licitação não encontrada');
      const { error } = await supabase
        .from('licitacoes')
        .update({ status: 'Autorizada' })
        .eq('id', licitacao.id);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success('🤖 Participação Autorizada!', {
        description: `Licitação ${licitacao?.numero || ''} - Movida para "Minhas Participações".`,
      });
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
      setShowAutorizacao(false);
      onClose();
    },
    onError: (error) => {
      console.error('Error authorizing:', error);
      toast.error('Erro ao autorizar participação');
    }
  });

  if (!licitacao) return null;

  const valor = licitacao.valor || 0;
  const precoSugerido = valor * 0.92;
  const margemCalculada = precoFinal > 0 ? ((valor - precoFinal) / valor) * 100 : 0;
  const margemMinima = 8;

  // Calculate time remaining
  const dataLimite = new Date(licitacao.data_limite);
  const daysRemaining = differenceInDays(dataLimite, new Date());
  const hoursRemaining = differenceInHours(dataLimite, new Date()) % 24;
  const isUrgent = daysRemaining < 3 && daysRemaining >= 0;
  const isExpired = daysRemaining < 0;
  const isAutorizada = licitacao.status === 'Autorizada' || licitacao.status === 'Em Disputa';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const formatDateOnly = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(licitacao.numero);
    toast.success('ID copiado para a área de transferência');
  };
  // Simulated data
  const icmsUf = licitacao.uf === 'SP' ? 18 : licitacao.uf === 'RJ' ? 20 : licitacao.uf === 'PA' ? 17 : 17;
  const custoLogistica = valor * 0.03;

  const analiseEdital = {
    amparoLegal: 'Lei 14.133/2021, Art. 75, II',
    tipo: 'Edital',
    modoDisputa: licitacao.modalidade.includes('Disputa') ? 'Aberto' : 'Fechado',
    registroPreco: 'Não',
    fonteOrcamentaria: 'Orçamento Municipal 2026',
    situacao: isExpired ? 'Encerrado' : isAutorizada ? 'Participando' : 'Recebendo Propostas',
  };

  // Termo de Referência - Itens detalhados simulados
  const termosReferencia = [
    { 
      item: 1, 
      descricao: licitacao.objeto?.substring(0, 80) || 'Item de aquisição',
      unidade: 'UN',
      quantidade: Math.floor(Math.random() * 100) + 10,
      valorUnitario: valor / (Math.floor(Math.random() * 50) + 10),
    },
    { 
      item: 2, 
      descricao: 'Material complementar conforme especificação técnica',
      unidade: 'UN',
      quantidade: Math.floor(Math.random() * 50) + 5,
      valorUnitario: (valor * 0.3) / (Math.floor(Math.random() * 30) + 5),
    },
    { 
      item: 3, 
      descricao: 'Serviço de instalação/entrega especializada',
      unidade: 'SV',
      quantidade: 1,
      valorUnitario: valor * 0.1,
    },
  ];

  // Informações de contrato e entrega
  const infoContrato = {
    prazoEntrega: '30 dias corridos após emissão da Nota de Empenho',
    localEntrega: `${licitacao.municipio}/${licitacao.uf} - Sede do Órgão`,
    vigenciaContrato: '12 meses a partir da assinatura',
    garantia: '12 meses contra defeitos de fabricação',
    formaPagamento: '30 dias após entrega e aceite definitivo',
    penalidades: 'Multa de 0,5% ao dia por atraso, até o limite de 10%',
  };

  // Órgão Pagador
  const orgaoPagador = {
    nome: licitacao.orgao,
    cnpj: '00.000.000/0001-00',
    endereco: `${licitacao.municipio}/${licitacao.uf}`,
    responsavel: 'Setor de Licitações e Contratos',
    dotacaoOrcamentaria: `${new Date().getFullYear()}.XX.XXX.XXXX.XXXX`,
    fonteRecurso: 'Recursos Próprios / Transferências Federais',
  };

  const checklistItems = [
    { label: 'Credenciamento SICAF', ok: true, detail: 'Válido até 24/08/2026', vencimento: new Date('2026-08-24') },
    { label: 'Habilitação Jurídica', ok: true, detail: 'Contrato Social Regular', vencimento: null },
    { label: 'Receita Federal e PGFN', ok: true, detail: 'Válida até 30/03/2026', vencimento: new Date('2026-03-30') },
    { label: 'FGTS - CRF', ok: true, detail: 'Válida até 22/01/2026', vencimento: new Date('2026-01-22') },
    { label: 'Certidão Trabalhista', ok: true, detail: 'Válida até 05/05/2026', vencimento: new Date('2026-05-05') },
    { label: 'Receita Municipal', ok: false, detail: 'Vencida em 13/01/2026 (*)', vencimento: new Date('2026-01-13') },
  ];

  return (
    <>
      <Sheet open={!!licitacao} onOpenChange={() => onClose()}>
        <SheetContent className="w-full sm:max-w-2xl lg:max-w-4xl p-0">
          <SheetHeader className="p-4 md:p-6 border-b bg-card sticky top-0 z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Globe className="w-3 h-3" />
                    {licitacao.portal}
                  </Badge>
                  <Badge className={`${statusColors[licitacao.status]?.bg} ${statusColors[licitacao.status]?.text} text-xs`}>
                    {licitacao.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">{licitacao.segmento}</Badge>
                  {isAutorizada && (
                    <Badge className="bg-success/20 text-success text-xs flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      Robô Ativo
                    </Badge>
                  )}
                  {isExpired ? (
                    <Badge variant="destructive" className="text-xs">Encerrado</Badge>
                  ) : isUrgent ? (
                    <Badge variant="destructive" className="animate-pulse text-xs">
                      <Timer className="w-3 h-3 mr-1" />
                      Urgente
                    </Badge>
                  ) : null}
                </div>
                <SheetTitle className="text-lg md:text-xl leading-tight pr-8">
                  {licitacao.objeto_resumido || licitacao.objeto?.substring(0, 80)}
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4 md:p-6 space-y-6">
              
              {/* Alert de Status Autorizado */}
              {isAutorizada && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30 animate-pulse">
                  <Bot className="w-8 h-8 text-success" />
                  <div className="flex-1">
                    <p className="font-bold text-success">✅ PARTICIPAÇÃO AUTORIZADA</p>
                    <p className="text-sm text-muted-foreground">
                      Esta licitação está na aba "Minhas Participações". O robô está monitorando e participará automaticamente.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/minhas-participacoes'}>
                    Ver Participações
                  </Button>
                </div>
              )}

              {/* Main Info Card - PNCP Style */}
              <Card>
                <CardContent className="p-4 md:p-6 space-y-4">
                  {/* Row 1 - Órgão e Local */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Building2 className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Órgão</p>
                        <p className="font-semibold text-sm">{licitacao.orgao}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Local</p>
                        <p className="font-semibold text-sm">{licitacao.municipio}/{licitacao.uf}</p>
                      </div>
                    </div>
                  </div>

                  {/* Órgão Pagador Destacado */}
                  <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-primary">ÓRGÃO PAGADOR</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Entidade Responsável</p>
                        <p className="font-semibold">{orgaoPagador.nome}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Localização</p>
                        <p className="font-semibold">{orgaoPagador.endereco}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Dotação Orçamentária</p>
                        <p className="font-semibold font-mono text-xs">{orgaoPagador.dotacaoOrcamentaria}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Fonte de Recurso</p>
                        <p className="font-semibold">{orgaoPagador.fonteRecurso}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2 - Modalidade e Amparo */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="font-semibold">Modalidade:</span>{' '}
                      <span className="text-muted-foreground">{licitacao.modalidade}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Amparo legal:</span>{' '}
                      <span className="text-muted-foreground">{analiseEdital.amparoLegal}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Modo de disputa:</span>{' '}
                      <span className="text-muted-foreground">{analiseEdital.modoDisputa}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Dates */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">Abertura:</span>{' '}
                      <span className="text-primary font-medium">{formatDate(licitacao.data_abertura)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">Prazo Final:</span>{' '}
                      <span className="text-primary font-medium">{formatDate(licitacao.data_limite)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Situação:</span>{' '}
                      <Badge variant={isAutorizada ? 'default' : 'secondary'} className={isAutorizada ? 'bg-success' : ''}>
                        {analiseEdital.situacao}
                      </Badge>
                    </div>
                  </div>

                  {/* ID */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">ID:</span>{' '}
                    <code className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-mono">
                      {licitacao.numero}
                    </code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Time Remaining + Value */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {!isExpired && (
                      <div className={`p-4 rounded-lg border ${isUrgent ? 'bg-destructive/10 border-destructive/30' : 'bg-secondary/50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Timer className={`w-4 h-4 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-semibold">Tempo Restante</span>
                        </div>
                        <p className={`text-xl font-bold ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
                          {daysRemaining}d {hoursRemaining}h
                        </p>
                      </div>
                    )}

                    <div className="p-4 rounded-lg bg-cyan-50 border border-cyan-200">
                      <p className="text-xs font-semibold text-cyan-800 uppercase tracking-wide mb-1">
                        VALOR TOTAL ESTIMADO
                      </p>
                      <p className="text-2xl font-bold text-cyan-900">
                        {formatCurrency(valor)}
                      </p>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                      <p className="text-xs text-success font-medium">Score ROI</p>
                      <p className="text-lg font-bold text-success">{licitacao.roi_score || 70}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                      <p className="text-xs text-warning font-medium">Score Risco</p>
                      <p className="text-lg font-bold text-warning">{licitacao.risco_score || 20}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Objeto Completo */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4" />
                    Objeto da Licitação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-lg">
                    {licitacao.objeto}
                  </p>
                </CardContent>
              </Card>

              {/* Termo de Referência - Itens Detalhados */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="w-4 h-4" />
                    Termo de Referência - Itens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                          <th className="px-3 py-2 text-center font-semibold">Un.</th>
                          <th className="px-3 py-2 text-center font-semibold">Qtd.</th>
                          <th className="px-3 py-2 text-right font-semibold">Vlr. Unit.</th>
                          <th className="px-3 py-2 text-right font-semibold">Vlr. Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {termosReferencia.map((item) => (
                          <tr key={item.item} className="border-b hover:bg-muted/30">
                            <td className="px-3 py-3 font-medium">{item.item}</td>
                            <td className="px-3 py-3 text-muted-foreground">{item.descricao}</td>
                            <td className="px-3 py-3 text-center">{item.unidade}</td>
                            <td className="px-3 py-3 text-center font-medium">{item.quantidade}</td>
                            <td className="px-3 py-3 text-right">{formatCurrency(item.valorUnitario)}</td>
                            <td className="px-3 py-3 text-right font-bold text-primary">{formatCurrency(item.valorUnitario * item.quantidade)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-primary/5 font-bold">
                          <td colSpan={5} className="px-3 py-3 text-right">TOTAL ESTIMADO:</td>
                          <td className="px-3 py-3 text-right text-primary text-lg">{formatCurrency(valor)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Informações de Contrato e Entrega */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="w-4 h-4" />
                    Prazos e Condições Contratuais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Truck className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Prazo de Entrega</p>
                        <p className="font-semibold text-sm">{infoContrato.prazoEntrega}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Local de Entrega</p>
                        <p className="font-semibold text-sm">{infoContrato.localEntrega}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Calendar className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Vigência do Contrato</p>
                        <p className="font-semibold text-sm">{infoContrato.vigenciaContrato}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Shield className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Garantia</p>
                        <p className="font-semibold text-sm">{infoContrato.garantia}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                      <Banknote className="w-5 h-5 text-success mt-0.5" />
                      <div>
                        <p className="text-xs text-success uppercase tracking-wide font-medium">Forma de Pagamento</p>
                        <p className="font-semibold text-sm">{infoContrato.formaPagamento}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                      <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <p className="text-xs text-warning uppercase tracking-wide font-medium">Penalidades</p>
                        <p className="font-semibold text-sm">{infoContrato.penalidades}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="compliance" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="compliance" className="gap-1 text-xs">
                    <Shield className="w-3 h-3" />
                    Compliance
                  </TabsTrigger>
                  <TabsTrigger value="cotacao" className="gap-1 text-xs">
                    <Calculator className="w-3 h-3" />
                    Cotação
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="gap-1 text-xs">
                    <FileText className="w-3 h-3" />
                    Documentos
                  </TabsTrigger>
                </TabsList>

                {/* Compliance Tab */}
                <TabsContent value="compliance" className="mt-4 space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                    <div>
                      <p className="font-semibold text-warning">Apta com Ressalva</p>
                      <p className="text-sm text-muted-foreground">Pendência na Certidão Municipal</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {checklistItems.map((item, i) => {
                      const hoje = new Date();
                      const diasParaVencer = item.vencimento ? Math.ceil((item.vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 999;
                      const vencendo = diasParaVencer > 0 && diasParaVencer <= 15;
                      const vencido = diasParaVencer <= 0;
                      
                      return (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          vencido ? 'bg-destructive/10 border-destructive/30' : 
                          vencendo ? 'bg-warning/10 border-warning/30' : 
                          'bg-success/5 border-success/20'
                        } ${vencendo || vencido ? 'animate-pulse' : ''}`}>
                          <div className="flex items-center gap-2">
                            {vencido ? (
                              <XCircle className="w-4 h-4 text-destructive animate-bounce" />
                            ) : vencendo ? (
                              <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            )}
                            <span className={`text-sm font-medium ${vencido ? 'text-destructive' : vencendo ? 'text-warning' : ''}`}>
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {vencendo && (
                              <Badge variant="outline" className="bg-warning/20 text-warning border-warning/50 animate-pulse text-xs">
                                ⚠️ {diasParaVencer}d
                              </Badge>
                            )}
                            {vencido && (
                              <Badge variant="destructive" className="animate-pulse text-xs">
                                🔴 VENCIDO
                              </Badge>
                            )}
                            <span className={`text-xs ${vencido ? 'text-destructive' : vencendo ? 'text-warning' : 'text-muted-foreground'}`}>
                              {item.detail}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Cotação Tab */}
                <TabsContent value="cotacao" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/50 border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <DollarSign className="w-3 h-3" />
                        Referência
                      </div>
                      <p className="text-sm font-bold">{formatCurrency(valor)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Percent className="w-3 h-3" />
                        ICMS {licitacao.uf}
                      </div>
                      <p className="text-sm font-bold">{icmsUf}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Truck className="w-3 h-3" />
                        Logística
                      </div>
                      <p className="text-sm font-bold">{formatCurrency(custoLogistica)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">Preço Final da Proposta</label>
                      <Badge className={margemCalculada >= margemMinima ? 'bg-success' : 'bg-destructive'}>
                        Margem: {margemCalculada.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input
                          type="number"
                          value={precoFinal || ''}
                          onChange={(e) => setPrecoFinal(parseFloat(e.target.value) || 0)}
                          placeholder={precoSugerido.toFixed(2)}
                          className="pl-10 font-bold"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setPrecoFinal(precoSugerido)}>
                        Sugerido
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preço sugerido: {formatCurrency(precoSugerido)} (margem mínima {margemMinima}%)
                    </p>
                  </div>
                </TabsContent>

                {/* Documentos Tab */}
                <TabsContent value="documentos" className="mt-4 space-y-3">
                  {[
                    { nome: 'Edital Completo', tipo: 'PDF', tamanho: '2.4 MB' },
                    { nome: 'Termo de Referência', tipo: 'PDF', tamanho: '1.1 MB' },
                    { nome: 'Anexo I - Especificações Técnicas', tipo: 'PDF', tamanho: '856 KB' },
                    { nome: 'Anexo II - Modelo de Proposta', tipo: 'DOCX', tamanho: '124 KB' },
                    { nome: 'Minuta do Contrato', tipo: 'PDF', tamanho: '432 KB' },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{doc.nome}</p>
                          <p className="text-xs text-muted-foreground">{doc.tipo} • {doc.tamanho}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {licitacao.edital_url && (
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href={licitacao.edital_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Acessar Portal Original
                      </a>
                    </Button>
                  )}
                </TabsContent>
              </Tabs>

              {/* Authorization Card */}
              {!isAutorizada && !isExpired && (
                <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                  <CardContent className="p-6 text-center space-y-4">
                    <Zap className="w-10 h-10 text-primary mx-auto" />
                    <div>
                      <h4 className="font-bold text-lg">Autorizar Participação do Robô</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ao autorizar, esta licitação será movida para "Minhas Participações" e o robô participará automaticamente.
                      </p>
                    </div>
                    
                    <Button 
                      size="lg" 
                      className="w-full bg-success hover:bg-success/90"
                      onClick={() => setShowAutorizacao(true)}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      AUTORIZAR PARTICIPAÇÃO
                    </Button>

                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Scale className="w-3 h-3" />
                      Lei 14.133/2021 • Proposta vinculante
                    </p>
                  </CardContent>
                </Card>
              )}

              {isExpired && (
                <Card className="border-2 border-dashed border-muted bg-muted/30">
                  <CardContent className="p-6 text-center space-y-4">
                    <Timer className="w-10 h-10 text-muted-foreground mx-auto" />
                    <div>
                      <h4 className="font-bold text-lg text-muted-foreground">Prazo Encerrado</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        O prazo para envio de propostas já foi encerrado.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Dialog de Autorização */}
      <AutorizacaoConfirmDialog
        open={showAutorizacao}
        onOpenChange={setShowAutorizacao}
        licitacao={{
          numero: licitacao.numero,
          orgao: licitacao.orgao,
          objeto: licitacao.objeto || '',
          valor: licitacao.valor,
          modalidade: licitacao.modalidade,
          portal: licitacao.portal,
        }}
        onConfirm={() => autorizarMutation.mutate()}
        isPending={autorizarMutation.isPending}
      />
    </>
  );
}
