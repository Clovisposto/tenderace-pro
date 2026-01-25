import { useState, forwardRef } from 'react';
import { Licitacao } from '@/types/licitacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface LicitacaoDetalheProps {
  licitacao: Licitacao;
  onClose: () => void;
  onAutorizar?: () => void;
}

const complianceConfig = {
  'Apta': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  'Apta c/ Ressalva': { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  'Inapta': { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export const LicitacaoDetalhe = forwardRef<HTMLDivElement, LicitacaoDetalheProps>(
  function LicitacaoDetalhe({ licitacao, onClose, onAutorizar }, ref) {
  const [precoFinal, setPrecoFinal] = useState(licitacao.valor * 0.92);
  const [autorizando, setAutorizando] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const ComplianceIcon = complianceConfig[licitacao.compliance].icon;

  // Simulated data for the detail view
  const cotacao = {
    precoReferencia: licitacao.valor,
    icmsUf: licitacao.uf === 'SP' ? 18 : licitacao.uf === 'RJ' ? 20 : 17,
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

  return (
    <div ref={ref} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card-elevated w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border/50 p-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="portal">{licitacao.portal}</Badge>
              <Badge variant="modalidade">{licitacao.modalidade}</Badge>
              <span className="text-sm text-muted-foreground font-mono">{licitacao.numero}</span>
            </div>
            <h2 className="text-2xl font-bold">{licitacao.objetoResumido}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Órgão:</span>
                <span className="font-medium">{licitacao.orgao}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Local:</span>
                <span className="font-medium">{licitacao.municipio}/{licitacao.uf}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Abertura:</span>
                <span className="font-medium">{format(licitacao.dataAbertura, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Prazo:</span>
                <span className="font-medium">{format(licitacao.dataLimite, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
            
            <div className="flex flex-col justify-center items-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Valor Estimado</p>
              <p className="text-4xl font-bold gradient-text">{formatCurrency(licitacao.valor)}</p>
            </div>
          </div>

          {/* Object Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Objeto da Licitação</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-lg">
              {licitacao.objeto}
            </p>
          </div>

          <Separator />

          {/* Compliance Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Status de Compliance</h3>
            </div>
            
            <div className={`flex items-center gap-4 p-4 rounded-xl ${complianceConfig[licitacao.compliance].bg}`}>
              <ComplianceIcon className={`w-8 h-8 ${complianceConfig[licitacao.compliance].color}`} />
              <div>
                <p className={`font-bold text-lg ${complianceConfig[licitacao.compliance].color}`}>
                  {licitacao.compliance}
                </p>
                <p className="text-sm text-muted-foreground">
                  {licitacao.compliance === 'Apta' && 'Empresa atende a todos os requisitos do edital'}
                  {licitacao.compliance === 'Apta c/ Ressalva' && 'Pendências menores que podem ser regularizadas'}
                  {licitacao.compliance === 'Inapta' && 'Documentação incompleta ou vencida - Não recomendada'}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'SICAF Regularizado', ok: licitacao.compliance !== 'Inapta' },
                { label: 'Certidões Válidas', ok: licitacao.compliance === 'Apta' },
                { label: 'Qualificação Técnica', ok: true },
                { label: 'Habilitação Jurídica', ok: licitacao.compliance !== 'Inapta' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {item.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className={item.ok ? 'text-foreground' : 'text-destructive'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Pricing Calculator */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Calculadora de Cotação</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  Preço de Referência
                </div>
                <p className="text-xl font-bold">{formatCurrency(cotacao.precoReferencia)}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Percent className="w-4 h-4" />
                  ICMS {licitacao.uf}
                </div>
                <p className="text-xl font-bold">{cotacao.icmsUf}%</p>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  Logística
                </div>
                <p className="text-xl font-bold">{formatCurrency(cotacao.custoLogistica)}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Preço Final da Proposta</label>
                <span className={`text-sm font-medium ${margemCalculada >= cotacao.margemMinima ? 'text-success' : 'text-destructive'}`}>
                  Margem: {margemCalculada.toFixed(1)}%
                </span>
              </div>
              <div className="flex gap-4">
                <Input
                  type="number"
                  value={precoFinal}
                  onChange={(e) => setPrecoFinal(parseFloat(e.target.value) || 0)}
                  className="text-xl font-bold bg-background"
                />
                <Button variant="outline" onClick={() => setPrecoFinal(licitacao.valor * 0.92)}>
                  Sugerido
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Margem mínima recomendada: {cotacao.margemMinima}% | Preço sugerido: {formatCurrency(licitacao.valor * 0.92)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Authorization Gate */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Gate de Autorização Legal</h3>
            </div>

            <div className="p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center space-y-4">
              <Zap className="w-12 h-12 text-primary mx-auto" />
              <div>
                <h4 className="font-bold text-lg">Autorização de Participação</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Ao clicar, você autoriza a IA a enviar proposta e participar automaticamente da disputa
                </p>
              </div>
              
              {licitacao.compliance === 'Inapta' ? (
                <Button variant="destructive" size="lg" disabled className="w-full max-w-sm">
                  <XCircle className="w-5 h-5 mr-2" />
                  Empresa Inapta - Participação Bloqueada
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full max-w-sm bg-success hover:bg-success/90"
                  onClick={handleAutorizar}
                  disabled={autorizando}
                >
                  {autorizando ? (
                    <>
                      <div className="w-5 h-5 border-2 border-success-foreground/30 border-t-success-foreground rounded-full animate-spin mr-2" />
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

              <p className="text-xs text-muted-foreground">
                Lei 14.133/2021 • Proposta vinculante após autorização
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

LicitacaoDetalhe.displayName = 'LicitacaoDetalhe';
