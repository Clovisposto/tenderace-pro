import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, ChevronLeft, ChevronRight, Building2, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Licitacao } from '@/hooks/useLicitacoes';

interface BLLMobileListProps {
  licitacoes: Licitacao[];
  onSelectDetail: (licitacao: Licitacao) => void;
  isLoading?: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
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

export function BLLMobileList({ 
  licitacoes, 
  onSelectDetail, 
  isLoading,
  page,
  pageSize,
  totalCount,
  onPageChange
}: BLLMobileListProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumero = (numero: string | null, id: string) => {
    if (numero) return numero;
    const year = new Date().getFullYear();
    return `Proc_${year}_${id.slice(0, 6)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (licitacoes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Nenhum processo encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* List Items */}
      {licitacoes.map((lic) => (
        <div 
          key={lic.id}
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer active:bg-secondary/50"
          onClick={() => onSelectDetail(lic)}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight line-clamp-2">
                {lic.objeto_resumido || lic.objeto?.substring(0, 60) + '...'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDetail(lic);
              }}
            >
              <Info className="w-4 h-4 text-primary" />
            </Button>
          </div>

          {/* Info Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{lic.orgao}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{lic.municipio}/{lic.uf}</span>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${statusColors[lic.status] || ''}`}>
                {lic.status}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {formatNumero(lic.numero, lic.id)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{formatCurrency(lic.valor)}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(lic.data_limite)}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Pagination */}
      <div className="flex items-center justify-between py-2">
        <p className="text-xs text-muted-foreground">
          {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} de {totalCount}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-2 text-sm">
            {page}/{totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
