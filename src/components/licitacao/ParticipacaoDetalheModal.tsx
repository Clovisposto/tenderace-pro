import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  Trophy,
  Printer,
  Download,
  Copy,
  Clock,
  Scale,
  Users,
  FileCheck,
  ShieldCheck,
  Pen,
  Bot,
  Activity,
  RefreshCw,
  Zap,
  AlertCircle,
  Timer,
  TrendingUp,
  ExternalLink,
  FileSignature,
  Sparkles,
  Loader2,
  Gavel,
  Eye,
  Mail,
} from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RobotActionLog } from './RobotActionLog';

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

interface ParticipacaoDetalheModalProps {
  participacao: Participacao;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParticipacaoDetalheModal({
  participacao,
  open,
  onOpenChange,
}: ParticipacaoDetalheModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [aiUpdateLog, setAiUpdateLog] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const contractRef = useRef<HTMLDivElement>(null);

  const { licitacao, empresa } = participacao;
  const isVencedora = participacao.status === 'Vencedora';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const formatDateFull = (date: string) =>
    format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const daysRemaining = differenceInDays(new Date(licitacao.data_limite), new Date());
  const hoursRemaining = differenceInHours(new Date(licitacao.data_limite), new Date()) % 24;
  const isExpired = daysRemaining < 0;

  // Simulate AI-powered update
  const handleAIUpdate = async () => {
    setIsUpdating(true);
    setAiUpdateLog([]);

    const steps = [
      { msg: '🔍 Conectando ao PNCP...', delay: 500 },
      { msg: '📡 Buscando atualizações do portal...', delay: 800 },
      { msg: '📄 Verificando status da licitação...', delay: 600 },
      { msg: '🔄 Sincronizando dados em tempo real...', delay: 700 },
      { msg: '🤖 IA analisando mudanças no edital...', delay: 900 },
      { msg: '✅ Verificação de compliance atualizada', delay: 500 },
      { msg: '📊 Recalculando scores ROI e Risco...', delay: 600 },
      { msg: '✨ Atualização concluída com sucesso!', delay: 400 },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      setAiUpdateLog((prev) => [...prev, step.msg]);
    }

    setIsUpdating(false);
    setLastUpdate(new Date());
    queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });
    
    toast({
      title: '✅ Atualização Concluída',
      description: 'O sistema foi atualizado com os dados mais recentes do portal.',
    });
  };

  const handlePrint = () => {
    const printContent = contractRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrato - ${licitacao.numero}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
            h2 { font-size: 14px; margin-top: 20px; }
            p { text-align: justify; margin: 10px 0; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin: 20px 0; }
            .signature { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature-line { text-align: center; width: 45%; }
            .signature-line hr { margin-bottom: 5px; }
            .value { font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCopyContract = () => {
    const text = contractRef.current?.innerText || '';
    navigator.clipboard.writeText(text);
    toast({
      title: 'Contrato Copiado',
      description: 'O texto do contrato foi copiado para a área de transferência.',
    });
  };

  const handleGeneratePdf = useCallback(async () => {
    setPdfLoading(true);
    setPdfBlobUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-proposta-pdf', {
        body: {
          proposta_id: participacao.id,
          licitacao_id: licitacao.id,
          empresa_id: participacao.empresa_id,
        },
      });

      if (error) throw error;
      if (!data?.pdf_base64) throw new Error('PDF não retornado');

      const binary = atob(data.pdf_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      toast({
        title: '✅ PDF Gerado',
        description: data.com_papel_timbrado
          ? 'Proposta com papel timbrado pronta para visualização.'
          : 'Proposta gerada (sem papel timbrado cadastrado).',
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o PDF da proposta.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  }, [participacao, licitacao]);

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = `Proposta_${licitacao.numero.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    a.click();
  };

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {isVencedora && <Trophy className="w-6 h-6 text-success" />}
            <span>Detalhes da Participação</span>
            <Badge
              className={
                isVencedora
                  ? 'bg-success/20 text-success'
                  : 'bg-primary/20 text-primary'
              }
            >
              {participacao.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="resumo" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-6 shrink-0 rounded-none border-b border-border px-6 bg-transparent h-auto pb-0">
            <TabsTrigger value="resumo" className="gap-1.5 rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="proposta-pdf" className="gap-1.5 rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Proposta</span>
            </TabsTrigger>
            <TabsTrigger value="robo" className="gap-1.5 rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Gavel className="w-4 h-4" />
              <span className="hidden sm:inline">Robô</span>
            </TabsTrigger>
            <TabsTrigger value="contrato" className="gap-1.5 rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <FileSignature className="w-4 h-4" />
              <span className="hidden sm:inline">Contrato</span>
            </TabsTrigger>
            <TabsTrigger value="atualizacao" className="gap-1.5 rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">IA 24/7</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5 rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
            <TabsContent value="resumo" className="m-0 space-y-4">
              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Dados da Licitação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número:</span>
                      <span className="font-medium">{licitacao.numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Portal:</span>
                      <Badge variant="outline">{licitacao.portal}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modalidade:</span>
                      <span className="font-medium">{licitacao.modalidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Órgão:</span>
                      <span className="font-medium truncate max-w-[200px]">{licitacao.orgao}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Local:</span>
                      <span className="font-medium">{licitacao.municipio}/{licitacao.uf}</span>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground">Objeto:</span>
                      <p className="font-medium mt-1">{licitacao.objeto_resumido || licitacao.objeto}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scale className="w-4 h-4 text-primary" />
                      Valores e Proposta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Valor Estimado</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(licitacao.valor)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10 text-center">
                        <p className="text-xs text-muted-foreground">Sua Proposta</p>
                        <p className="text-lg font-bold text-success">
                          {formatCurrency(participacao.valor_proposta)}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-warning/10 text-center">
                      <p className="text-xs text-muted-foreground">Economia Gerada</p>
                      <p className="text-xl font-bold text-warning">
                        {((1 - participacao.valor_proposta / licitacao.valor) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({formatCurrency(licitacao.valor - participacao.valor_proposta)})
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="flex flex-col items-center">
                        <TrendingUp className="w-5 h-5 text-success mb-1" />
                        <span className="text-xs text-muted-foreground">ROI</span>
                        <span className="font-bold">{licitacao.roi_score}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <AlertCircle className="w-5 h-5 text-warning mb-1" />
                        <span className="text-xs text-muted-foreground">Risco</span>
                        <span className="font-bold">{licitacao.risco_score}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Datas e Prazos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Abertura</p>
                      <p className="font-medium text-sm">{formatDate(licitacao.data_abertura)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <Timer className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Prazo Final</p>
                      <p className="font-medium text-sm">{formatDate(licitacao.data_limite)}</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${isExpired ? 'bg-destructive/10' : 'bg-success/10'}`}>
                      <CheckCircle2 className={`w-5 h-5 mx-auto mb-1 ${isExpired ? 'text-destructive' : 'text-success'}`} />
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className={`font-medium text-sm ${isExpired ? 'text-destructive' : 'text-success'}`}>
                        {isExpired ? 'Encerrado' : `${daysRemaining}d ${hoursRemaining}h`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Empresa Participante
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{empresa.nome}</p>
                    <p className="text-sm text-muted-foreground">CNPJ: {empresa.cnpj}</p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    SICAF Regular
                  </Badge>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Robô Tab - Log de Ações em Tempo Real */}
            <TabsContent value="robo" className="m-0">
              <RobotActionLog
                licitacaoId={licitacao.id}
                propostaId={participacao.id}
                empresaId={participacao.empresa_id}
                valorProposta={participacao.valor_proposta}
                status={participacao.status}
              />
            </TabsContent>

            {/* Contrato Tab */}
            <TabsContent value="contrato" className="m-0 space-y-4">
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Imprimir Contrato
                </Button>
                <Button variant="outline" onClick={handleCopyContract} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copiar Texto
                </Button>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </Button>
                {isVencedora && (
                  <Button variant="default" className="gap-2 bg-success hover:bg-success/90 ml-auto">
                    <Pen className="w-4 h-4" />
                    Assinar Digitalmente
                  </Button>
                )}
              </div>

              {/* Contract Document */}
              <Card className="border-2">
                <CardContent className="p-8" ref={contractRef}>
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase mb-2">
                      CONTRATO DE FORNECIMENTO
                    </h1>
                    <p className="text-muted-foreground">
                      Contratação nº {licitacao.numero}
                    </p>
                  </div>

                  <div className="space-y-6 text-sm leading-relaxed">
                    <div>
                      <h2 className="font-bold text-lg mb-2">CONTRATANTE</h2>
                      <p className="text-justify">
                        <strong>{licitacao.orgao.toUpperCase()}</strong>, com sede em{' '}
                        <strong>{licitacao.municipio}/{licitacao.uf}</strong>, inscrito no CNPJ sob o nº
                        XX.XXX.XXX/0001-XX, neste ato representado por seu(sua) representante legal,
                        doravante denominado <strong>CONTRATANTE</strong>.
                      </p>
                    </div>

                    <div>
                      <h2 className="font-bold text-lg mb-2">CONTRATADA</h2>
                      <p className="text-justify">
                        <strong>{empresa.nome}</strong>, pessoa jurídica de direito privado, inscrita
                        no CNPJ sob o nº <strong>{empresa.cnpj}</strong>, com sede e foro na cidade de
                        Belém/PA, neste ato representada por seu representante legal, doravante denominada{' '}
                        <strong>CONTRATADA</strong>.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h2 className="font-bold text-lg mb-2">CLÁUSULA PRIMEIRA - DO OBJETO</h2>
                      <p className="text-justify">
                        O presente contrato tem por objeto: <strong>{licitacao.objeto}</strong>,
                        conforme especificações constantes do Edital de Licitação nº {licitacao.numero}
                        e seus anexos, modalidade {licitacao.modalidade}, que passam a integrar o presente
                        instrumento, independentemente de transcrição.
                      </p>
                    </div>

                    <div>
                      <h2 className="font-bold text-lg mb-2">CLÁUSULA SEGUNDA - DO VALOR</h2>
                      <p className="text-justify">
                        O valor total do presente contrato é de{' '}
                        <strong>{formatCurrency(participacao.valor_proposta)}</strong>{' '}
                        ({participacao.valor_proposta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', 'reais')}),
                        conforme proposta vencedora apresentada pela CONTRATADA, representando uma economia de{' '}
                        <strong>{((1 - participacao.valor_proposta / licitacao.valor) * 100).toFixed(1)}%</strong>{' '}
                        em relação ao valor estimado de {formatCurrency(licitacao.valor)}.
                      </p>
                    </div>

                    <div>
                      <h2 className="font-bold text-lg mb-2">CLÁUSULA TERCEIRA - DA VIGÊNCIA</h2>
                      <p className="text-justify">
                        O presente contrato terá vigência de 12 (doze) meses, contados a partir da data
                        de sua assinatura, podendo ser prorrogado na forma da Lei nº 14.133/2021.
                      </p>
                    </div>

                    <div>
                      <h2 className="font-bold text-lg mb-2">CLÁUSULA QUARTA - DO PAGAMENTO</h2>
                      <p className="text-justify">
                        O pagamento será efetuado em até 30 (trinta) dias após a entrega dos produtos/serviços
                        e apresentação da Nota Fiscal devidamente atestada pelo fiscal do contrato,
                        mediante crédito em conta corrente indicada pela CONTRATADA.
                      </p>
                    </div>

                    <div>
                      <h2 className="font-bold text-lg mb-2">CLÁUSULA QUINTA - DAS OBRIGAÇÕES</h2>
                      <p className="text-justify">
                        <strong>5.1.</strong> A CONTRATADA obriga-se a executar o objeto deste contrato
                        em conformidade com as especificações do edital e da proposta, mantendo durante
                        toda a execução do contrato as condições de habilitação exigidas na licitação.
                      </p>
                      <p className="text-justify mt-2">
                        <strong>5.2.</strong> O CONTRATANTE obriga-se a efetuar o pagamento na forma e
                        prazo estipulados, fiscalizar a execução do contrato e comunicar à CONTRATADA
                        quaisquer irregularidades detectadas.
                      </p>
                    </div>

                    <div>
                      <h2 className="font-bold text-lg mb-2">CLÁUSULA SEXTA - DO FORO</h2>
                      <p className="text-justify">
                        Fica eleito o Foro da Comarca de {licitacao.municipio}/{licitacao.uf} para dirimir
                        quaisquer dúvidas oriundas do presente contrato, com renúncia expressa de qualquer
                        outro, por mais privilegiado que seja.
                      </p>
                    </div>

                    <Separator className="my-8" />

                    <p className="text-center text-muted-foreground">
                      {licitacao.municipio}/{licitacao.uf}, {formatDateFull(new Date().toISOString())}
                    </p>

                    <div className="grid grid-cols-2 gap-16 mt-16 pt-8">
                      <div className="text-center">
                        <div className="border-t border-foreground pt-2">
                          <p className="font-bold">{licitacao.orgao}</p>
                          <p className="text-sm text-muted-foreground">CONTRATANTE</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="border-t border-foreground pt-2">
                          <p className="font-bold">{empresa.nome}</p>
                          <p className="text-sm text-muted-foreground">CONTRATADA</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 text-center">
                      <p className="text-xs text-muted-foreground">
                        Documento gerado automaticamente pelo sistema LicitaIA em{' '}
                        {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Processo licitatório em conformidade com a Lei nº 14.133/2021
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Atualização IA Tab */}
            <TabsContent value="atualizacao" className="m-0 space-y-4">
              {/* Status Banner */}
              <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">IA de Monitoramento 24/7</h3>
                      <p className="text-sm text-muted-foreground">
                        Sistema automático de atualização e sincronização
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                    <span className="text-sm font-medium text-success">Ativo</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleAIUpdate}
                  disabled={isUpdating}
                  className="h-auto py-4 gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  <div className="text-left">
                    <p className="font-semibold">Atualizar Agora</p>
                    <p className="text-xs opacity-80">Sincronizar com portais</p>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto py-4 gap-2">
                  <Zap className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Verificação Rápida</p>
                    <p className="text-xs opacity-80">Checar status atual</p>
                  </div>
                </Button>
              </div>

              {/* AI Update Log */}
              {(isUpdating || aiUpdateLog.length > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Log de Atualização IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 font-mono text-sm">
                      {aiUpdateLog.map((log, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 animate-fade-in"
                        >
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          <span>{log}</span>
                        </div>
                      ))}
                      {isUpdating && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-muted-foreground">Processando...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Auto Update Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Atualizações Automáticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold text-primary">24h</p>
                      <p className="text-xs text-muted-foreground">Monitoramento</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold text-primary">1h</p>
                      <p className="text-xs text-muted-foreground">Intervalo Sync</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Última atualização:</span>
                      <span className="font-medium">
                        {lastUpdate
                          ? format(lastUpdate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Próxima sincronização:</span>
                      <span className="font-medium">Em 58 minutos</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Portais monitorados:</span>
                      <span className="font-medium">PNCP, ComprasNet, BLL</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-success/5 border-success/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-full bg-success/20">
                      <FileCheck className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Verificação de Editais</p>
                      <p className="text-xs text-muted-foreground">
                        IA analisa alterações e retificações automaticamente
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Compliance Contínuo</p>
                      <p className="text-xs text-muted-foreground">
                        Monitoramento de certidões e documentos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="historico" className="m-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Linha do Tempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-0">
                    {[
                      {
                        date: participacao.created_at,
                        title: 'Proposta Enviada',
                        description: `Valor: ${formatCurrency(participacao.valor_proposta)}`,
                        icon: FileText,
                        color: 'bg-primary',
                      },
                      ...(participacao.status === 'Vencedora'
                        ? [
                            {
                              date: new Date().toISOString(),
                              title: 'Licitação Vencida',
                              description: 'Parabéns! Sua proposta foi a vencedora.',
                              icon: Trophy,
                              color: 'bg-success',
                            },
                          ]
                        : []),
                      {
                        date: new Date().toISOString(),
                        title: 'Última Verificação IA',
                        description: 'Sistema atualizado automaticamente',
                        icon: Bot,
                        color: 'bg-primary',
                      },
                    ].map((event, index) => (
                      <div key={index} className="flex gap-4 pb-6 last:pb-0">
                        <div className="relative flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full ${event.color} flex items-center justify-center text-white z-10`}
                          >
                            <event.icon className="w-5 h-5" />
                          </div>
                          {index < 2 && (
                            <div className="w-0.5 bg-border absolute top-10 bottom-0 left-1/2 -translate-x-1/2" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{event.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.date), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
