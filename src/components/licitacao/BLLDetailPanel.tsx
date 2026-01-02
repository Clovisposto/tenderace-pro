import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
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
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Licitacao } from '@/hooks/useLicitacoes';

interface BLLDetailPanelProps {
  licitacao: Licitacao | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  'Nova': 'bg-accent/20 text-accent border-accent/30',
  'Em Análise': 'bg-warning/20 text-warning border-warning/30',
  'Aguardando Autorização': 'bg-warning/20 text-warning border-warning/30',
  'Autorizada': 'bg-primary/20 text-primary border-primary/30',
  'Em Disputa': 'bg-primary/20 text-primary border-primary/30',
  'Vencida': 'bg-success/20 text-success border-success/30',
  'Perdida': 'bg-destructive/20 text-destructive border-destructive/30',
  'Cancelada': 'bg-muted text-muted-foreground border-muted',
};

export function BLLDetailPanel({ licitacao, onClose }: BLLDetailPanelProps) {
  const [precoFinal, setPrecoFinal] = useState(0);
  const [autorizando, setAutorizando] = useState(false);

  if (!licitacao) return null;

  const valor = licitacao.valor || 0;
  const precoSugerido = valor * 0.92;
  const margemCalculada = precoFinal > 0 ? ((valor - precoFinal) / valor) * 100 : 0;
  const margemMinima = 8;

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

  const handleAutorizar = () => {
    setAutorizando(true);
    setTimeout(() => {
      toast.success('Participação autorizada com sucesso!', {
        description: `Licitação ${licitacao.numero} - Proposta será enviada automaticamente.`,
      });
      setAutorizando(false);
      onClose();
    }, 1500);
  };

  // Simulated ICMS by UF
  const icmsUf = licitacao.uf === 'SP' ? 18 : licitacao.uf === 'RJ' ? 20 : 17;
  const custoLogistica = valor * 0.03;

  // Checklist items (simulated)
  const checklistItems = [
    { label: 'SICAF Regularizado', ok: true },
    { label: 'Certidões Válidas', ok: true },
    { label: 'Qualificação Técnica', ok: true },
    { label: 'Habilitação Jurídica', ok: true },
  ];

  return (
    <Dialog open={!!licitacao} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {licitacao.portal}
            </Badge>
            <Badge className={statusColors[licitacao.status]}>
              {licitacao.status}
            </Badge>
            <span className="text-sm text-muted-foreground font-mono">
              {licitacao.numero || `Proc_${new Date().getFullYear()}_${licitacao.id.slice(0,6)}`}
            </span>
          </div>
          <DialogTitle className="text-xl">
            {licitacao.objeto_resumido || licitacao.objeto?.substring(0, 80) + '...'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Links Oficiais */}
          {licitacao.edital_url && (
            <div className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg">
              <LinkIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Links Oficiais:</span>
              <a 
                href={licitacao.edital_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Edital/Documentos <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Órgão:</span>
                <span className="font-medium">{licitacao.orgao}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Local:</span>
                <span className="font-medium">{licitacao.municipio}/{licitacao.uf}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Publicação:</span>
                <span className="font-medium">{formatDate(licitacao.data_abertura)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Encerramento:</span>
                <span className="font-medium">{formatDate(licitacao.data_limite)}</span>
              </div>
            </div>
            
            <div className="flex flex-col justify-center items-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Valor Estimado</p>
              <p className="text-3xl font-bold gradient-text">{formatCurrency(valor)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {licitacao.modalidade}
              </p>
            </div>
          </div>

          {/* Objeto */}
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

          {/* Checklist */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Checklist de Compliance
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-secondary/30">
                  {item.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Cotação */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Calculadora de Cotação</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  Preço Referência
                </div>
                <p className="text-lg font-bold">{formatCurrency(valor)}</p>
              </div>
              
              <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Percent className="w-3 h-3" />
                  ICMS {licitacao.uf}
                </div>
                <p className="text-lg font-bold">{icmsUf}%</p>
              </div>
              
              <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="w-3 h-3" />
                  Logística
                </div>
                <p className="text-lg font-bold">{formatCurrency(custoLogistica)}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Preço Final da Proposta</label>
                <span className={`text-sm font-medium ${margemCalculada >= margemMinima ? 'text-success' : 'text-destructive'}`}>
                  Margem: {margemCalculada.toFixed(1)}%
                </span>
              </div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  value={precoFinal || ''}
                  onChange={(e) => setPrecoFinal(parseFloat(e.target.value) || 0)}
                  placeholder={formatCurrency(precoSugerido)}
                  className="text-lg font-bold bg-background"
                />
                <Button variant="outline" onClick={() => setPrecoFinal(precoSugerido)}>
                  Sugerido
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Margem mínima: {margemMinima}% | Sugerido: {formatCurrency(precoSugerido)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Autorização */}
          <div className="p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center space-y-4">
            <Zap className="w-10 h-10 text-primary mx-auto" />
            <div>
              <h4 className="font-bold text-lg">Autorização de Participação</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Ao clicar, você autoriza a IA a enviar proposta e participar da disputa
              </p>
            </div>
            
            <Button 
              size="lg" 
              className="w-full max-w-sm"
              onClick={handleAutorizar}
              disabled={autorizando}
            >
              {autorizando ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Autorizando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  AUTORIZAR PARTICIPAÇÃO
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Lei 14.133/2021 • Proposta vinculante após autorização
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
