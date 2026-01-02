import { Licitacao } from '@/types/licitacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ExternalLink,
  Eye,
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LicitacaoTableViewProps {
  licitacoes: Licitacao[];
  onSelect: (licitacao: Licitacao) => void;
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  'Nova': 'bg-accent/20 text-accent border-accent/30',
  'Em Análise': 'bg-warning/20 text-warning border-warning/30',
  'Aguardando Autorização': 'bg-primary/20 text-primary border-primary/30',
  'Autorizada': 'bg-success/20 text-success border-success/30',
  'Em Disputa': 'bg-accent/30 text-accent border-accent/40',
  'Vencida': 'bg-success/30 text-success border-success/40',
  'Perdida': 'bg-destructive/20 text-destructive border-destructive/30',
  'Cancelada': 'bg-muted text-muted-foreground border-muted-foreground/30',
};

const portalColors: Record<string, string> = {
  'PNCP': 'bg-primary/20 text-primary',
  'ComprasNet': 'bg-accent/20 text-accent',
  'ComprasPublicas': 'bg-success/20 text-success',
  'BLL': 'bg-warning/20 text-warning',
};

export function LicitacaoTableView({ licitacoes, onSelect, isLoading }: LicitacaoTableViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isUrgent = (dataLimite: Date) => {
    return dataLimite.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  };

  if (isLoading) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando licitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[100px] text-xs font-bold text-muted-foreground">PORTAL</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">ÓRGÃO</TableHead>
              <TableHead className="w-[140px] text-xs font-bold text-muted-foreground">MUNICÍPIO/UF</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground min-w-[250px]">OBJETO</TableHead>
              <TableHead className="w-[120px] text-xs font-bold text-muted-foreground text-right">VALOR</TableHead>
              <TableHead className="w-[130px] text-xs font-bold text-muted-foreground">ABERTURA</TableHead>
              <TableHead className="w-[130px] text-xs font-bold text-muted-foreground">SITUAÇÃO</TableHead>
              <TableHead className="w-[80px] text-xs font-bold text-muted-foreground text-center">ROI</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licitacoes.map((licitacao, index) => (
              <TableRow 
                key={licitacao.id} 
                className="table-row-hover border-border/30 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => onSelect(licitacao)}
              >
                <TableCell>
                  <Badge className={`text-xs font-medium ${portalColors[licitacao.portal] || 'bg-secondary'}`}>
                    {licitacao.portal}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="max-w-[200px] truncate" title={licitacao.orgao}>
                    {licitacao.orgao}
                  </div>
                  {licitacao.uasg && (
                    <span className="text-xs text-muted-foreground">UASG: {licitacao.uasg}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{licitacao.municipio}</span>
                    <span className="text-xs text-muted-foreground">/{licitacao.uf}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px]">
                    <p className="text-sm line-clamp-2" title={licitacao.objeto}>
                      {licitacao.objetoResumido || licitacao.objeto}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs py-0">
                        {licitacao.modalidade}
                      </Badge>
                      <Badge variant="outline" className="text-xs py-0 border-primary/30 text-primary">
                        {licitacao.segmento}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-foreground">
                    {formatCurrency(licitacao.valor)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {format(licitacao.dataAbertura, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${isUrgent(licitacao.dataLimite) ? 'text-warning' : 'text-muted-foreground'}`}>
                      {isUrgent(licitacao.dataLimite) && <AlertTriangle className="w-3 h-3" />}
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(licitacao.dataLimite, { locale: ptBR, addSuffix: true })}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[licitacao.status]}`}>
                    {licitacao.status}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-sm font-medium text-success">{licitacao.roiScore}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {licitacoes.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-muted-foreground">Nenhuma licitação encontrada com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
}