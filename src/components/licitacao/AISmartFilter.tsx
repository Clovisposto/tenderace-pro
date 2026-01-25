import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Shield, 
  ChevronDown,
  Target,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Licitacao } from '@/hooks/useLicitacoes';

interface AIAnalyzedLicitacao extends Licitacao {
  ai_score?: number;
  ai_priority?: 'alta' | 'media' | 'baixa';
  ai_reasoning?: string;
  estimated_success?: number;
  recommended_action?: string;
}

interface AISmartFilterProps {
  licitacoes: Licitacao[];
  onSelectLicitacao: (licitacao: Licitacao) => void;
  segmento?: string;
}

export const AISmartFilter = ({ licitacoes, onSelectLicitacao, segmento }: AISmartFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedResults, setAnalyzedResults] = useState<AIAnalyzedLicitacao[]>([]);
  const [analysisMethod, setAnalysisMethod] = useState<string>('');

  const analyzeWithAI = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('filtro-inteligente', {
        body: { 
          licitacoes: licitacoes.slice(0, 30),
          segmento,
          limit: 10
        }
      });

      if (error) {
        console.error('AI Filter error:', error);
        
        if (error.message?.includes('429')) {
          toast.error('Limite de IA atingido', {
            description: 'Aguarde alguns segundos e tente novamente'
          });
        } else if (error.message?.includes('402')) {
          toast.error('Créditos de IA insuficientes');
        } else {
          toast.error('Erro na análise de IA');
        }
        return;
      }

      if (data?.success && data.analyzed) {
        setAnalyzedResults(data.analyzed);
        setAnalysisMethod(data.method || 'ai');
        setIsOpen(true);
        
        toast.success(`${data.analyzed.length} licitações priorizadas por IA`, {
          description: data.method === 'ai' 
            ? 'Análise completa com Gemini Flash' 
            : 'Análise algorítmica (fallback)'
        });
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error('Falha na análise inteligente');
    } finally {
      setIsAnalyzing(false);
    }
  }, [licitacoes, segmento]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'alta': return 'bg-success/10 text-success border-success/30';
      case 'media': return 'bg-warning/10 text-warning border-warning/30';
      case 'baixa': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'alta': return <Zap className="w-3 h-3" />;
      case 'media': return <Clock className="w-3 h-3" />;
      case 'baixa': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-3">
          <div className="flex items-center justify-between gap-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  Filtro Inteligente
                  <Sparkles className="w-3 h-3 text-primary" />
                </h3>
                <p className="text-xs text-muted-foreground">
                  Priorização automática por ROI e Risco
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {analyzedResults.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Target className="w-3 h-3" />
                  {analyzedResults.length} priorizadas
                </Badge>
              )}
              
              <Button
                variant="default"
                size="sm"
                onClick={analyzeWithAI}
                disabled={isAnalyzing || licitacoes.length === 0}
                className="gap-1.5 text-xs"
              >
                {isAnalyzing ? (
                  <>
                    <Brain className="w-3.5 h-3.5 animate-pulse" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analisar
                  </>
                )}
              </Button>

              {analyzedResults.length > 0 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      isOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 border-t border-border">
            <div className="pt-3">
              {/* Method indicator */}
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  {analysisMethod === 'ai' ? 'Gemini Flash IA' : 'Algoritmo Local'}
                </Badge>
                <span>•</span>
                <span>{analyzedResults.length} de {licitacoes.length} analisadas</span>
              </div>

              {/* Results */}
              <ScrollArea className="h-[300px] pr-2">
                <div className="space-y-2">
                  {analyzedResults.map((item, idx) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        item.ai_priority === 'alta' 
                          ? "bg-success/5 border-success/20 hover:border-success/40" 
                          : item.ai_priority === 'media'
                          ? "bg-warning/5 border-warning/20 hover:border-warning/40"
                          : "bg-card border-border hover:border-primary/30"
                      )}
                      onClick={() => onSelectLicitacao(item)}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] gap-1", getPriorityColor(item.ai_priority))}
                          >
                            {getPriorityIcon(item.ai_priority)}
                            {item.ai_priority?.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.portal}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(item.valor)}
                        </span>
                      </div>

                      {/* Object */}
                      <p className="text-xs text-foreground line-clamp-2 mb-2">
                        {item.objeto_resumido || item.objeto.substring(0, 100)}
                      </p>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <span>{item.municipio}/{item.uf}</span>
                        <span>•</span>
                        <span>{item.modalidade}</span>
                      </div>

                      {/* AI Score Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="w-3 h-3" />
                            Score IA
                          </span>
                          <span className="font-medium">{item.ai_score || 0}%</span>
                        </div>
                        <Progress 
                          value={item.ai_score || 0} 
                          className="h-1.5"
                        />
                      </div>

                      {/* Bottom row */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Shield className="w-3 h-3" />
                            Sucesso: {item.estimated_success || 0}%
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                          {item.recommended_action || 'Ver detalhes'}
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>

                      {/* AI Reasoning */}
                      {item.ai_reasoning && (
                        <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                          <p className="text-[10px] text-muted-foreground italic">
                            💡 {item.ai_reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Summary */}
              {analyzedResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="w-3 h-3" />
                      {analyzedResults.filter(r => r.ai_priority === 'alta').length} alta prioridade
                    </span>
                    <span className="flex items-center gap-1 text-warning">
                      <Clock className="w-3 h-3" />
                      {analyzedResults.filter(r => r.ai_priority === 'media').length} média
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    Valor total: {formatCurrency(analyzedResults.reduce((sum, r) => sum + r.valor, 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
