import { useState } from 'react';
import { Licitacao } from '@/types/licitacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Calculator,
  Truck,
  Percent,
  DollarSign,
  ShieldCheck,
  Zap,
  ExternalLink,
  Download,
  Copy,
  Globe,
  Scale,
  BookOpen,
  FileCheck,
  Gavel,
  Users,
  Timer,
  Info,
  Hash
} from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface LicitacaoDetalheCompletoProps {
  licitacao: Licitacao;
  onClose: () => void;
  onAutorizar?: () => void;
}

const complianceConfig = {
  'Apta': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  'Apta c/ Ressalva': { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  'Inapta': { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
};

const statusConfig: Record<string, { bg: string; text: string }> = {
  'Nova': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Em Análise': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Aguardando Autorização': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Autorizada': { bg: 'bg-green-100', text: 'text-green-800' },
  'Em Disputa': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Vencida': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'Perdida': { bg: 'bg-red-100', text: 'text-red-800' },
  'Cancelada': { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export function LicitacaoDetalheCompleto({ licitacao, onClose, onAutorizar }: LicitacaoDetalheCompletoProps) {
  const [precoFinal, setPrecoFinal] = useState(licitacao.valor * 0.92);
  const [autorizando, setAutorizando] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatDateOnly = (date: Date) => {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const ComplianceIcon = complianceConfig[licitacao.compliance].icon;

  // Calculate time remaining
  const daysRemaining = differenceInDays(licitacao.dataLimite, new Date());
  const hoursRemaining = differenceInHours(licitacao.dataLimite, new Date()) % 24;
  const isUrgent = daysRemaining < 3;
  const isExpired = daysRemaining < 0;

  // Simulated data
  const cotacao = {
    precoReferencia: licitacao.valor,
    icmsUf: licitacao.uf === 'SP' ? 18 : licitacao.uf === 'RJ' ? 20 : licitacao.uf === 'PA' ? 17 : 17,
    custoLogistica: licitacao.valor * 0.03,
    margemMinima: 8,
  };

  const margemCalculada = ((licitacao.valor - precoFinal) / licitacao.valor) * 100;

  const handleAutorizar = () => {
    setAutorizando(true);
    setTimeout(() => {
      toast.success('Participação autorizada com sucesso!', {
        description: `Licitação ${licitacao.numero} - Proposta será enviada automaticamente.`,
      });
      setAutorizando(false);
      onAutorizar?.();
    }, 1500);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(licitacao.numero);
    toast.success('ID copiado para a área de transferência');
  };

  // Simulated edital analysis data
  const analiseEdital = {
    amparoLegal: 'Lei 14.133/2021, Art. 75, II',
    tipo: 'Edital',
    modoDisputa: licitacao.modalidade.includes('Disputa') ? 'Aberto' : 'Fechado',
    registroPreco: 'Não',
    fonteOrcamentaria: 'Orçamento Municipal',
    situacao: 'Recebendo Propostas',
    unidadeCompradora: licitacao.uasg || `${licitacao.orgao.substring(0, 50)}`,
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b p-4 md:p-6 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="gap-1">
                <Globe className="w-3 h-3" />
                {licitacao.portal}
              </Badge>
              <Badge className={`${statusConfig[licitacao.status]?.bg} ${statusConfig[licitacao.status]?.text}`}>
                {licitacao.status}
              </Badge>
              <Badge variant="secondary">{licitacao.segmento}</Badge>
              {isExpired ? (
                <Badge variant="destructive">Encerrado</Badge>
              ) : isUrgent ? (
                <Badge variant="destructive" className="animate-pulse">
                  <Timer className="w-3 h-3 mr-1" />
                  Urgente
                </Badge>
              ) : null}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
              {licitacao.objetoResumido || licitacao.objeto.substring(0, 80)}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="icon" onClick={() => window.open(`https://pncp.gov.br/app/editais?q=${licitacao.numero}`, '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 space-y-6">
            
            {/* Info Cards Grid - PNCP Style */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Main Info */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <span className="font-semibold text-foreground">Local:</span>{' '}
                        <span className="text-muted-foreground">{licitacao.municipio}/{licitacao.uf}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Órgão:</span>{' '}
                        <span className="text-muted-foreground uppercase">{licitacao.orgao}</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-foreground">Unidade compradora:</span>{' '}
                      <span className="text-muted-foreground">{analiseEdital.unidadeCompradora}</span>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <span className="font-semibold text-foreground">Modalidade da contratação:</span>{' '}
                        <span className="text-muted-foreground">{licitacao.modalidade}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Amparo legal:</span>{' '}
                        <span className="text-muted-foreground">{analiseEdital.amparoLegal}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <span className="font-semibold text-foreground">Tipo:</span>{' '}
                        <span className="text-muted-foreground">{analiseEdital.tipo}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Modo de disputa:</span>{' '}
                        <span className="text-muted-foreground">{analiseEdital.modoDisputa}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <span className="font-semibold text-foreground">Registro de preço:</span>{' '}
                        <span className="text-muted-foreground">{analiseEdital.registroPreco}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Fonte orçamentária:</span>{' '}
                        <span className="text-muted-foreground">{analiseEdital.fonteOrcamentaria}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <span className="font-semibold text-foreground">Data de divulgação no PNCP:</span>{' '}
                        <span className="text-muted-foreground">{formatDateOnly(licitacao.createdAt)}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Situação:</span>{' '}
                        <span className="text-muted-foreground">{analiseEdital.situacao}</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-foreground">Data de início de recebimento de propostas:</span>{' '}
                      <span className="text-primary">{formatDate(licitacao.dataAbertura)} (horário de Brasília)</span>
                    </div>

                    <div>
                      <span className="font-semibold text-foreground">Data fim de recebimento de propostas:</span>{' '}
                      <span className="text-primary">{formatDate(licitacao.dataLimite)} (horário de Brasília)</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">Id contratação PNCP:</span>{' '}
                      <code className="text-primary bg-primary/10 px-2 py-1 rounded text-sm font-mono">{licitacao.numero}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Right Column - Value Card */}
                  <div className="space-y-4">
                    {/* Tempo Restante */}
                    {!isExpired && (
                      <div className={`p-4 rounded-lg border ${isUrgent ? 'bg-destructive/10 border-destructive/30' : 'bg-secondary/50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Timer className={`w-5 h-5 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} />
                          <span className="font-semibold">Tempo Restante</span>
                        </div>
                        <p className={`text-2xl font-bold ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
                          {daysRemaining} dias e {hoursRemaining} horas
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          até {formatDate(licitacao.dataLimite)}
                        </p>
                      </div>
                    )}

                    {/* Valor */}
                    <div className="p-6 rounded-lg bg-cyan-50 border border-cyan-200">
                      <p className="text-sm font-semibold text-cyan-800 uppercase tracking-wide mb-2">
                        VALOR TOTAL ESTIMADO DA COMPRA
                      </p>
                      <p className="text-3xl font-bold text-cyan-900">
                        {formatCurrency(licitacao.valor)}
                      </p>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                        <p className="text-sm text-success font-medium">Score ROI</p>
                        <p className="text-2xl font-bold text-success">{licitacao.roiScore}%</p>
                      </div>
                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                        <p className="text-sm text-warning font-medium">Score Risco</p>
                        <p className="text-2xl font-bold text-warning">{licitacao.riscoScore}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Objeto */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold text-foreground mb-3">Objeto:</h3>
                  <p className="text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-lg">
                    {licitacao.objeto}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Details */}
            <Tabs defaultValue="compliance" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="compliance" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Compliance
                </TabsTrigger>
                <TabsTrigger value="cotacao" className="gap-2">
                  <Calculator className="w-4 h-4" />
                  Cotação
                </TabsTrigger>
                <TabsTrigger value="documentos" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger value="autorizacao" className="gap-2">
                  <Gavel className="w-4 h-4" />
                  Autorização
                </TabsTrigger>
              </TabsList>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Status de Compliance SICAF
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`flex items-center gap-4 p-4 rounded-xl border ${complianceConfig[licitacao.compliance].bg} ${complianceConfig[licitacao.compliance].border}`}>
                      <ComplianceIcon className={`w-10 h-10 ${complianceConfig[licitacao.compliance].color}`} />
                      <div>
                        <p className={`font-bold text-xl ${complianceConfig[licitacao.compliance].color}`}>
                          {licitacao.compliance}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {licitacao.compliance === 'Apta' && 'Empresa atende a todos os requisitos do edital'}
                          {licitacao.compliance === 'Apta c/ Ressalva' && 'Pendências menores que podem ser regularizadas (Certidão Municipal)'}
                          {licitacao.compliance === 'Inapta' && 'Documentação incompleta ou vencida - Não recomendada'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Credenciamento SICAF', ok: true, detail: 'Válido até 24/08/2026' },
                        { label: 'Habilitação Jurídica', ok: true, detail: 'Contrato Social Regular' },
                        { label: 'Receita Federal e PGFN', ok: true, detail: 'Válida até 30/03/2026' },
                        { label: 'FGTS - CRF', ok: true, detail: 'Válida até 22/01/2026' },
                        { label: 'Certidão Trabalhista (TST)', ok: true, detail: 'Válida até 05/05/2026' },
                        { label: 'Receita Estadual/Distrital', ok: true, detail: 'Válida até 28/02/2026' },
                        { label: 'Receita Municipal', ok: licitacao.compliance === 'Apta', detail: licitacao.compliance === 'Apta' ? 'Válida' : 'Vencida em 13/01/2026 (*)' },
                        { label: 'Qualificação Econômico-Financeira', ok: true, detail: 'Válida até 30/06/2026' },
                      ].map((item, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${item.ok ? 'bg-success/5' : 'bg-destructive/5'} border ${item.ok ? 'border-success/20' : 'border-destructive/20'}`}>
                          <div className="flex items-center gap-2">
                            {item.ok ? (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive" />
                            )}
                            <span className={`font-medium ${item.ok ? 'text-foreground' : 'text-destructive'}`}>
                              {item.label}
                            </span>
                          </div>
                          <span className={`text-sm ${item.ok ? 'text-muted-foreground' : 'text-destructive'}`}>
                            {item.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cotação Tab */}
              <TabsContent value="cotacao" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Calculadora de Cotação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-secondary/50 border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <DollarSign className="w-4 h-4" />
                          Preço de Referência
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(cotacao.precoReferencia)}</p>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-secondary/50 border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Percent className="w-4 h-4" />
                          ICMS {licitacao.uf}
                        </div>
                        <p className="text-xl font-bold">{cotacao.icmsUf}%</p>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-secondary/50 border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Truck className="w-4 h-4" />
                          Custo Logística
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(cotacao.custoLogistica)}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-secondary/50 border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Percent className="w-4 h-4" />
                          Margem Mínima
                        </div>
                        <p className="text-xl font-bold">{cotacao.margemMinima}%</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-lg font-semibold">Preço Final da Proposta</label>
                        <Badge className={margemCalculada >= cotacao.margemMinima ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                          Margem: {margemCalculada.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            value={precoFinal}
                            onChange={(e) => setPrecoFinal(parseFloat(e.target.value) || 0)}
                            className="text-2xl font-bold pl-10 h-14"
                          />
                        </div>
                        <Button variant="outline" size="lg" onClick={() => setPrecoFinal(licitacao.valor * 0.92)}>
                          Preço Sugerido
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Preço sugerido com margem de 8%: <strong>{formatCurrency(licitacao.valor * 0.92)}</strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documentos Tab */}
              <TabsContent value="documentos" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documentos do Edital
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { nome: 'Edital Completo', tipo: 'PDF', tamanho: '2.4 MB' },
                        { nome: 'Termo de Referência', tipo: 'PDF', tamanho: '1.1 MB' },
                        { nome: 'Anexo I - Especificações Técnicas', tipo: 'PDF', tamanho: '856 KB' },
                        { nome: 'Minuta de Contrato', tipo: 'PDF', tamanho: '324 KB' },
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileCheck className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{doc.nome}</p>
                              <p className="text-sm text-muted-foreground">{doc.tipo} • {doc.tamanho}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Baixar
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      * Os documentos serão baixados diretamente do portal {licitacao.portal}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Autorização Tab */}
              <TabsContent value="autorizacao" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="w-5 h-5" />
                      Gate de Autorização Legal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-8 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center space-y-6">
                      <Zap className="w-16 h-16 text-primary mx-auto" />
                      <div>
                        <h4 className="font-bold text-2xl">Autorização de Participação</h4>
                        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                          Ao clicar, você autoriza a IA a enviar proposta no valor de <strong>{formatCurrency(precoFinal)}</strong> e participar automaticamente da disputa em nome da empresa.
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        {licitacao.compliance === 'Inapta' ? (
                          <Button variant="destructive" size="lg" disabled className="w-full max-w-md h-14 text-lg">
                            <XCircle className="w-5 h-5 mr-2" />
                            Empresa Inapta - Participação Bloqueada
                          </Button>
                        ) : isExpired ? (
                          <Button variant="destructive" size="lg" disabled className="w-full max-w-md h-14 text-lg">
                            <Timer className="w-5 h-5 mr-2" />
                            Prazo Encerrado
                          </Button>
                        ) : (
                          <Button 
                            variant="default"
                            size="lg"
                            className="w-full max-w-md h-14 text-lg bg-success hover:bg-success/90"
                            onClick={handleAutorizar}
                            disabled={autorizando}
                          >
                            {autorizando ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Autorizando...
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-5 h-5 mr-2" />
                                AUTORIZAR PARTICIPAÇÃO
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Scale className="w-4 h-4" />
                        Lei 14.133/2021 • Proposta vinculante após autorização
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
