import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Scale,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Download,
  Shield,
  Gavel,
  BookOpen,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Irregularidade {
  titulo: string;
  descricao: string;
  fundamentoLegal: string;
  jurisprudencia?: string;
  argumentacao?: string;
  gravidade: 'alta' | 'media' | 'baixa';
}

interface AnaliseImpugnacao {
  resumoGeral: string;
  recomendacaoImpugnar: boolean;
  nivelRisco: 'baixo' | 'medio' | 'alto';
  irregularidades: Irregularidade[];
  modeloImpugnacao?: string;
  prazoImpugnacao?: string;
}

interface ImpugnacaoSystemProps {
  licitacao: {
    id: string;
    numero: string;
    orgao: string;
    objeto: string;
    valor: number;
    modalidade: string;
    edital_url?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImpugnacaoSystem({ licitacao, isOpen, onClose }: ImpugnacaoSystemProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analise, setAnalise] = useState<AnaliseImpugnacao | null>(null);
  const [selectedIrregularidade, setSelectedIrregularidade] = useState<Irregularidade | null>(null);

  const handleAnalyze = async () => {
    if (!licitacao) return;
    
    setIsAnalyzing(true);
    setAnalise(null);

    try {
      const { data, error } = await supabase.functions.invoke('analisar-impugnacao', {
        body: {
          licitacaoNumero: licitacao.numero,
          modalidade: licitacao.modalidade,
          valor: licitacao.valor,
          orgao: licitacao.orgao,
          editalTexto: null, // Would be the actual edital text if available
        }
      });

      if (error) throw error;

      if (data.success) {
        setAnalise(data.analise);
        toast({
          title: '✅ Análise Concluída',
          description: `${data.analise.irregularidades?.length || 0} possíveis irregularidades identificadas.`,
        });
      } else {
        throw new Error(data.error || 'Erro na análise');
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      toast({
        title: 'Erro na Análise',
        description: error instanceof Error ? error.message : 'Erro ao analisar edital',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyPeticao = () => {
    if (analise?.modeloImpugnacao) {
      navigator.clipboard.writeText(analise.modeloImpugnacao);
      toast({
        title: '📋 Copiado!',
        description: 'Modelo de petição copiado para a área de transferência.',
      });
    }
  };

  const getGravidadeColor = (gravidade: string) => {
    switch (gravidade) {
      case 'alta': return 'bg-destructive text-destructive-foreground';
      case 'media': return 'bg-warning text-warning-foreground';
      case 'baixa': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiscoColor = (nivel: string) => {
    switch (nivel) {
      case 'alto': return 'text-destructive';
      case 'medio': return 'text-warning';
      case 'baixo': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  if (!licitacao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Sistema de Impugnação Automática
          </DialogTitle>
          <DialogDescription>
            Análise jurídica automatizada com base na Lei 14.133/2021
          </DialogDescription>
        </DialogHeader>

        {/* Licitação Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Número:</span>
                <p className="font-medium">{licitacao.numero}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Órgão:</span>
                <p className="font-medium">{licitacao.orgao}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Modalidade:</span>
                <p className="font-medium">{licitacao.modalidade}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor:</span>
                <p className="font-medium">
                  R$ {licitacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!analise && !isAnalyzing && (
          <div className="text-center py-8">
            <Scale className="w-16 h-16 mx-auto mb-4 text-primary/50" />
            <h3 className="text-lg font-semibold mb-2">Análise Jurídica com IA</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              O sistema irá analisar o edital em busca de irregularidades e gerar 
              automaticamente a fundamentação legal para impugnação.
            </p>
            <Button onClick={handleAnalyze} size="lg" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Iniciar Análise Automática
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-lg font-semibold mb-2">Analisando Edital...</h3>
            <p className="text-muted-foreground">
              A IA está verificando possíveis irregularidades com base na Lei 14.133/2021
            </p>
            <div className="mt-4 max-w-md mx-auto">
              <Progress value={66} className="h-2" />
            </div>
          </div>
        )}

        {analise && (
          <div className="space-y-6">
            {/* Resumo */}
            <Card className={`border-2 ${
              analise.recomendacaoImpugnar ? 'border-destructive/50 bg-destructive/5' : 'border-success/50 bg-success/5'
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {analise.recomendacaoImpugnar ? (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                  Parecer da Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{analise.resumoGeral}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge className={analise.recomendacaoImpugnar ? 'bg-destructive' : 'bg-success'}>
                    {analise.recomendacaoImpugnar ? 'Recomenda Impugnar' : 'Não Recomenda Impugnar'}
                  </Badge>
                  <span className={`text-sm font-medium ${getRiscoColor(analise.nivelRisco)}`}>
                    Risco: {analise.nivelRisco.toUpperCase()}
                  </span>
                  {analise.prazoImpugnacao && (
                    <span className="text-xs text-muted-foreground">
                      Prazo: {analise.prazoImpugnacao}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Irregularidades */}
            {analise.irregularidades && analise.irregularidades.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Irregularidades Identificadas ({analise.irregularidades.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {analise.irregularidades.map((irreg, index) => (
                        <Card 
                          key={index} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedIrregularidade(irreg)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getGravidadeColor(irreg.gravidade)}>
                                    {irreg.gravidade.toUpperCase()}
                                  </Badge>
                                  <h4 className="font-medium text-sm">{irreg.titulo}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {irreg.descricao}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <BookOpen className="w-4 h-4" />
                              </Button>
                            </div>
                            {irreg.fundamentoLegal && (
                              <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                <strong>Fundamento:</strong> {irreg.fundamentoLegal}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Modelo de Petição */}
            {analise.modeloImpugnacao && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Modelo de Petição de Impugnação
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyPeticao}>
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                      {analise.modeloImpugnacao}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={handleAnalyze}>
                <Sparkles className="w-4 h-4 mr-2" />
                Nova Análise
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                {analise.recomendacaoImpugnar && (
                  <Button className="gap-2">
                    <Gavel className="w-4 h-4" />
                    Protocolar Impugnação
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal for Irregularidade */}
        {selectedIrregularidade && (
          <Dialog open={!!selectedIrregularidade} onOpenChange={() => setSelectedIrregularidade(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={getGravidadeColor(selectedIrregularidade.gravidade)}>
                    {selectedIrregularidade.gravidade.toUpperCase()}
                  </Badge>
                  {selectedIrregularidade.titulo}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Descrição</h4>
                  <p className="text-sm text-muted-foreground">{selectedIrregularidade.descricao}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-1">Fundamento Legal</h4>
                  <p className="text-sm text-muted-foreground">{selectedIrregularidade.fundamentoLegal}</p>
                </div>
                {selectedIrregularidade.jurisprudencia && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Jurisprudência TCU</h4>
                      <p className="text-sm text-muted-foreground">{selectedIrregularidade.jurisprudencia}</p>
                    </div>
                  </>
                )}
                {selectedIrregularidade.argumentacao && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Argumentação Sugerida</h4>
                      <p className="text-sm text-muted-foreground">{selectedIrregularidade.argumentacao}</p>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
