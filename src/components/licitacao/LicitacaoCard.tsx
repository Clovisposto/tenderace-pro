import { useState, forwardRef } from 'react';
import { Licitacao } from '@/types/licitacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  MapPin, 
  Building2, 
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Bot,
  Check,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AutorizacaoConfirmDialog } from './AutorizacaoConfirmDialog';

interface LicitacaoCardProps {
  licitacao: Licitacao;
  onClick?: () => void;
  delay?: number;
}

const complianceVariant = {
  'Apta': 'apta',
  'Apta c/ Ressalva': 'ressalva',
  'Inapta': 'inapta',
} as const;

const statusColors = {
  'Nova': 'bg-accent/20 text-accent border-accent/30',
  'Em Análise': 'bg-warning/20 text-warning border-warning/30',
  'Aguardando Autorização': 'bg-primary/20 text-primary border-primary/30',
  'Autorizada': 'bg-success/20 text-success border-success/30',
  'Em Disputa': 'bg-accent/30 text-accent border-accent/40',
  'Vencida': 'bg-success/30 text-success border-success/40',
  'Perdida': 'bg-destructive/20 text-destructive border-destructive/30',
  'Cancelada': 'bg-muted text-muted-foreground border-muted-foreground/30',
};

export const LicitacaoCard = forwardRef<HTMLDivElement, LicitacaoCardProps>(
  ({ licitacao, onClick, delay = 0 }, ref) => {
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const autorizarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('licitacoes')
        .update({ status: 'Autorizada' })
        .eq('id', licitacao.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setShowConfirmDialog(false);
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
      toast({
        title: "✅ Robô Autorizado com Sucesso!",
        description: `O robô foi autorizado a participar da licitação ${licitacao.numero}. Monitoramento 24/7 ativo.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro na Autorização",
        description: "Não foi possível autorizar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleOpenConfirmDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDialog(true);
  };

  const handleConfirmAutorizar = () => {
    autorizarMutation.mutate();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const timeToDeadline = formatDistanceToNow(licitacao.dataLimite, {
    locale: ptBR,
    addSuffix: true,
  });

  const isUrgent = licitacao.dataLimite.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const isAutorizada = licitacao.status === 'Autorizada';

  return (
    <div 
      ref={ref}
      className="glass-card p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer group animate-slide-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="portal">{licitacao.portal}</Badge>
            <Badge variant="modalidade">{licitacao.modalidade}</Badge>
            <Badge 
              variant={complianceVariant[licitacao.compliance]}
            >
              {licitacao.compliance}
            </Badge>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[licitacao.status]}`}>
              {licitacao.status}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {licitacao.objetoResumido}
          </h3>

          {/* Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span className="truncate max-w-[200px]">{licitacao.orgao}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{licitacao.municipio}/{licitacao.uf}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-1.5 text-sm ${isUrgent ? 'text-warning' : 'text-muted-foreground'}`}>
              {isUrgent && <AlertTriangle className="w-4 h-4" />}
              <Clock className="w-4 h-4" />
              <span>{timeToDeadline}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-success" />
              <span>ROI: {licitacao.roiScore}%</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end justify-between h-full gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
            <p className="text-xl font-bold gradient-text">{formatCurrency(licitacao.valor)}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {isAutorizada ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success/20 text-success text-xs font-medium">
                <Check className="w-3.5 h-3.5" />
                Robô Ativo
              </div>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={handleOpenConfirmDialog}
                className="gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                Autorizar
              </Button>
            )}
            
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AutorizacaoConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        licitacao={{
          numero: licitacao.numero,
          orgao: licitacao.orgao,
          objeto: licitacao.objeto || licitacao.objetoResumido,
          valor: licitacao.valor,
          modalidade: licitacao.modalidade,
          portal: licitacao.portal,
        }}
        onConfirm={handleConfirmAutorizar}
        isPending={autorizarMutation.isPending}
      />
    </div>
  );
});

LicitacaoCard.displayName = 'LicitacaoCard';
