import { useState, useEffect, useCallback } from 'react';
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
  Hash,
  Bot,
  Mail,
  Send
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentosEditalCard } from './DocumentosEditalCard';
import { useEmpresas } from '@/hooks/useEmpresas';
import { PlanilhaCotacao } from './PlanilhaCotacao';

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
  const [detectingMethod, setDetectingMethod] = useState(false);
  const [detectedResult, setDetectedResult] = useState<{ metodo_envio?: string; email_destino?: string; confianca?: string; justificativa?: string } | null>(null);
  const [emailDestino, setEmailDestino] = useState(licitacao.emailDestino || '');
  const [editingEmail, setEditingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const queryClient = useQueryClient();
  const { data: empresas } = useEmpresas();
  // Pega a empresa do segmento da licitação (ou primeira). Realtime já invalida via useEmpresas.
  const empresaAtiva = (empresas || []).find((e: any) => e.segmento === licitacao.segmento) || (empresas || [])[0];
  const certidoesEmpresa: any = (empresaAtiva as any)?.certidoes || {};
  const sicafAtualizadoEm: string | null = (empresaAtiva as any)?.sicaf_atualizado_em || null;

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

  // Mutation to authorize participation
  const autorizarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('licitacoes')
        .update({ status: 'Autorizada' })
        .eq('id', licitacao.id);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success('🤖 Participação autorizada com sucesso!', {
        description: `Licitação ${licitacao.numero} - O robô vai participar automaticamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
      onAutorizar?.();
    },
    onError: (error) => {
      console.error('Error authorizing:', error);
      toast.error('Erro ao autorizar participação', {
        description: 'Tente novamente ou contate o suporte.',
      });
    }
  });

  const handleAutorizar = () => {
    autorizarMutation.mutate();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(licitacao.numero);
    toast.success('ID copiado para a área de transferência');
  };

  const handleDetectMethod = async () => {
    setDetectingMethod(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extrair-metodo-envio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ licitacao_id: licitacao.id }),
        }
      );
      const result = await response.json();
      if (result.success) {
        setDetectedResult(result);
        if (result.email_destino) {
          setEmailDestino(result.email_destino);
        }
        queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
        toast.success(`Método detectado: ${result.metodo_envio === 'email' ? 'Envio por E-mail' : result.metodo_envio === 'presencial' ? 'Presencial' : 'Portal Eletrônico'}`, {
          description: result.justificativa,
        });
      } else if (result.error_code === 'AI_CREDITS_EXHAUSTED') {
        toast.error('Créditos de IA esgotados', {
          description: 'Adicione créditos em Configurações > Workspace > Uso para retomar a detecção automática.',
        });
      } else {
        toast.error(result.error || 'Erro ao detectar método');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao detectar método de envio');
    } finally {
      setDetectingMethod(false);
    }
  };

  const handleSaveEmail = async () => {
    const trimmed = emailDestino.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('E-mail inválido');
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from('licitacoes')
        .update({ email_destino: trimmed || null })
        .eq('id', licitacao.id);
      if (error) throw error;
      toast.success(trimmed ? 'E-mail de destino salvo' : 'E-mail de destino removido');
      setEditingEmail(false);
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar e-mail');
    } finally {
      setSavingEmail(false);
    }
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

                    {/* Método de Envio */}
                    <div className="mt-2 p-3 rounded-lg border bg-secondary/30">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">Método de envio da proposta:</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={handleDetectMethod}
                          disabled={detectingMethod}
                        >
                          {detectingMethod ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Lendo edital...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              Detectar via IA
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Método de envio badge */}
                      {(detectedResult?.metodo_envio || licitacao.metodoEnvio) === 'email' ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          <Mail className="w-3 h-3 mr-1" />
                          Envio por E-mail
                        </Badge>
                      ) : (detectedResult?.metodo_envio || licitacao.metodoEnvio) === 'presencial' ? (
                        <Badge className="bg-purple-100 text-purple-800">Envio Presencial</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Globe className="w-3 h-3 mr-1" />
                          Via Portal Eletrônico
                        </Badge>
                      )}

                      {/* Email destino - editável */}
                      <div className="mt-3 p-3 rounded-md border bg-background">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            E-mail de destino da proposta
                          </span>
                          {!editingEmail && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs gap-1"
                              onClick={() => setEditingEmail(true)}
                            >
                              <FileText className="w-3 h-3" />
                              {emailDestino ? 'Editar' : 'Adicionar'}
                            </Button>
                          )}
                        </div>

                        {editingEmail ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="email"
                              placeholder="email@orgao.gov.br"
                              value={emailDestino}
                              onChange={(e) => setEmailDestino(e.target.value)}
                              className="h-8 text-sm flex-1"
                              autoFocus
                              maxLength={255}
                            />
                            <Button
                              size="sm"
                              className="h-8 gap-1"
                              onClick={handleSaveEmail}
                              disabled={savingEmail}
                            >
                              {savingEmail ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Salvar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setEditingEmail(false);
                                setEmailDestino(licitacao.emailDestino || '');
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : emailDestino ? (
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <code className="text-primary bg-primary/10 px-2 py-1 rounded text-sm font-mono">
                              {emailDestino}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(emailDestino);
                                toast.success('E-mail copiado');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => {
                                const subject = encodeURIComponent(`Proposta - ${licitacao.numero} - ${licitacao.objeto.substring(0, 60)}`);
                                const body = encodeURIComponent(
                                  `Prezados,\n\nSegue em anexo a proposta de preços referente à licitação ${licitacao.numero}.\n\nObjeto: ${licitacao.objeto.substring(0, 120)}\n\nAtenciosamente.`
                                );
                                window.open(`mailto:${emailDestino}?subject=${subject}&body=${body}`, '_blank');
                              }}
                            >
                              <Mail className="w-3 h-3" />
                              Enviar E-mail
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            Nenhum e-mail configurado. O robô usará envio via portal. Adicione um e-mail para habilitar envio automático por email.
                          </p>
                        )}
                      </div>

                      {detectedResult?.justificativa && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          <Info className="w-3 h-3 inline mr-1" />
                          {detectedResult.justificativa}
                          {detectedResult.confianca && ` (Confiança: ${detectedResult.confianca})`}
                        </p>
                      )}
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
            <Tabs defaultValue="cotacao" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="compliance" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Compliance
                </TabsTrigger>
                <TabsTrigger value="cotacao" className="gap-2">
                  <Calculator className="w-4 h-4" />
                  Planilha (Edital + IA + Manual)
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
                      {sicafAtualizadoEm && (
                        <Badge variant="outline" className="ml-auto text-[10px] font-normal">
                          🟢 Atualizado {format(new Date(sicafAtualizadoEm), "dd/MM HH:mm", { locale: ptBR })}
                        </Badge>
                      )}
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
                          {licitacao.compliance === 'Apta c/ Ressalva' && 'Pendências menores que podem ser regularizadas'}
                          {licitacao.compliance === 'Inapta' && 'Documentação incompleta ou vencida - Não recomendada'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        const defs: Array<{ key: string; label: string }> = [
                          { key: 'credenciamento_sicaf', label: 'Credenciamento SICAF' },
                          { key: 'habilitacao_juridica', label: 'Habilitação Jurídica' },
                          { key: 'receita_federal_pgfn', label: 'Receita Federal e PGFN' },
                          { key: 'fgts_crf', label: 'FGTS - CRF' },
                          { key: 'trabalhista_tst', label: 'Certidão Trabalhista (TST)' },
                          { key: 'receita_estadual', label: 'Receita Estadual/Distrital' },
                          { key: 'receita_municipal', label: 'Receita Municipal' },
                          { key: 'qualificacao_economico_financeira', label: 'Qualificação Econômico-Financeira' },
                        ];
                        return defs.map((d) => {
                          const c = certidoesEmpresa?.[d.key] || {};
                          const venc: Date | null = c.validade ? new Date(c.validade) : null;
                          const status = c.status || 'ausente';
                          const detail = c.detalhe || (venc ? `Válida até ${format(venc, 'dd/MM/yyyy')}` : 'Aguardando sincronização');
                          return { label: d.label, ok: status === 'valido', detail, vencimento: venc, statusRaw: status };
                        });
                      })().map((item, i) => {
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
                                <XCircle className="w-5 h-5 text-destructive animate-bounce" />
                              ) : vencendo ? (
                                <AlertTriangle className="w-5 h-5 text-warning animate-pulse" />
                              ) : (
                                <CheckCircle2 className="w-5 h-5 text-success" />
                              )}
                              <span className={`font-medium ${vencido ? 'text-destructive' : vencendo ? 'text-warning' : 'text-foreground'}`}>
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
                              <span className={`text-sm ${vencido ? 'text-destructive' : vencendo ? 'text-warning' : 'text-muted-foreground'}`}>
                                {item.detail}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cotação Tab */}
              <TabsContent value="cotacao" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Planilha de Cotação por Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlanilhaCotacao
                      licitacaoId={licitacao.id}
                      itensJaExtraidos={(licitacao as any).itensExtraidos || (licitacao as any).itens_extraidos || false}
                      licitacaoNumero={licitacao.numero}
                      licitacaoStatus={licitacao.status}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documentos Tab */}
              <TabsContent value="documentos" className="mt-4 space-y-4">
                {/* Documentação de Habilitação Exigida */}
                <Card className="border-2 border-warning/30 bg-warning/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-warning">
                      <FileCheck className="w-5 h-5" />
                      Documentação de Habilitação Exigida pelo Edital
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Habilitação Jurídica */}
                      <div className="p-4 rounded-lg bg-card border">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Scale className="w-4 h-4 text-primary" />
                          Habilitação Jurídica
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {[
                            'Ato constitutivo, estatuto ou contrato social em vigor',
                            'Documento de eleição de administradores',
                            'Cédula de identidade dos sócios/representantes',
                            'Procuração (se representante)',
                          ].map((doc, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Regularidade Fiscal */}
                      <div className="p-4 rounded-lg bg-card border">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Regularidade Fiscal e Trabalhista
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {[
                            'Prova de inscrição no CNPJ',
                            'Certidão Conjunta RFB/PGFN (Dívida Ativa)',
                            'Certidão de Regularidade do FGTS (CRF)',
                            'Certidão Negativa de Débitos Trabalhistas (CNDT)',
                            'Certidão de Regularidade Estadual',
                            'Certidão de Regularidade Municipal',
                          ].map((doc, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Qualificação Técnica */}
                      <div className="p-4 rounded-lg bg-card border">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          Qualificação Técnica
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {(licitacao.segmento === 'Medicamentos' ? [
                            'Autorização de Funcionamento ANVISA',
                            'Licença de Funcionamento Sanitário',
                            'Autorização Especial ANVISA (se controlados)',
                            'Responsável Técnico com CRF ativo',
                            'Atestado de Capacidade Técnica',
                          ] : [
                            'Registro ou inscrição no órgão profissional competente',
                            'Atestado de Capacidade Técnica',
                            'Comprovação de aptidão para desempenho',
                            'Declaração de disponibilidade de equipamentos',
                          ]).map((doc, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Qualificação Econômico-Financeira */}
                      <div className="p-4 rounded-lg bg-card border">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Qualificação Econômico-Financeira
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {[
                            'Balanço patrimonial do último exercício',
                            'Certidão negativa de falência/recuperação judicial',
                            'Demonstração de Índices Contábeis (ILC, ILG, SG)',
                            'Capital social mínimo (se exigido)',
                          ].map((doc, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Declarações Obrigatórias */}
                    <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Declarações Obrigatórias
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {[
                          'Declaração de inexistência de fato impeditivo',
                          'Declaração de cumprimento do Art. 7º, XXXIII da CF',
                          'Declaração de enquadramento como ME/EPP (se aplicável)',
                          'Declaração de elaboração independente de proposta',
                          'Declaração de cumprimento das normas de acessibilidade',
                          'Declaração de reserva de cargos PCD e reabilitados',
                        ].map((doc, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <FileCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Documentos do Edital para Download */}
                <DocumentosEditalCard 
                  numero={licitacao.numero} 
                  portal={licitacao.portal as string} 
                />
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
                      <div className="flex justify-center">
                        <div className="p-4 rounded-full bg-primary/10">
                          <Bot className="w-16 h-16 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-2xl">Autorização de Participação do Robô</h4>
                        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                          Ao clicar, você autoriza o <strong>Robô 24/7</strong> a monitorar esta licitação e participar automaticamente da disputa com proposta de <strong>{formatCurrency(precoFinal)}</strong>.
                        </p>
                      </div>

                      {licitacao.status === 'Autorizada' ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="w-6 h-6" />
                            <span className="font-semibold text-lg">Já Autorizada</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            O robô está monitorando esta licitação. Acompanhe na aba "Participações".
                          </p>
                        </div>
                      ) : (
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
                              disabled={autorizarMutation.isPending}
                            >
                              {autorizarMutation.isPending ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                  Autorizando...
                                </>
                              ) : (
                                <>
                                  <Bot className="w-5 h-5 mr-2" />
                                  AUTORIZAR ROBÔ PARTICIPAR
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}

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
