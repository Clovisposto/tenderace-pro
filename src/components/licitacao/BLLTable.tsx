import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Licitacao } from '@/hooks/useLicitacoes';

interface BLLTableProps {
  licitacoes: Licitacao[];
  onSelectDetail: (licitacao: Licitacao) => void;
  isLoading?: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

type SortField = 'orgao' | 'numero' | 'status' | 'modalidade' | 'data_abertura' | 'data_limite';
type SortDir = 'asc' | 'desc';

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

export function BLLTable({ 
  licitacoes, 
  onSelectDetail, 
  isLoading,
  page,
  pageSize,
  totalCount,
  onPageChange
}: BLLTableProps) {
  const [sortField, setSortField] = useState<SortField>('data_abertura');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedLicitacoes = [...licitacoes].sort((a, b) => {
    let aVal: string | number | Date = '';
    let bVal: string | number | Date = '';
    
    switch (sortField) {
      case 'orgao':
        aVal = a.orgao || '';
        bVal = b.orgao || '';
        break;
      case 'numero':
        aVal = a.numero || '';
        bVal = b.numero || '';
        break;
      case 'status':
        aVal = a.status || '';
        bVal = b.status || '';
        break;
      case 'modalidade':
        aVal = a.modalidade || '';
        bVal = b.modalidade || '';
        break;
      case 'data_abertura':
        aVal = new Date(a.data_abertura).getTime();
        bVal = new Date(b.data_abertura).getTime();
        break;
      case 'data_limite':
        aVal = new Date(a.data_limite).getTime();
        bVal = new Date(b.data_limite).getTime();
        break;
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yy HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const formatNumero = (numero: string | null, id: string) => {
    if (numero) return numero;
    const year = new Date().getFullYear();
    return `Proc_${year}_${id.slice(0, 6)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Promotor</TableHead>
              <TableHead>Nº/Processo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Data Publicação</TableHead>
              <TableHead>Data Encerramento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (sortedLicitacoes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">Nenhum processo encontrado com os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[50px] text-center">
                <span className="sr-only">Detalhes</span>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('orgao')}
              >
                <div className="flex items-center gap-1">
                  Promotor
                  <SortIcon field="orgao" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('numero')}
              >
                <div className="flex items-center gap-1">
                  Nº/Processo
                  <SortIcon field="numero" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('modalidade')}
              >
                <div className="flex items-center gap-1">
                  Modalidade
                  <SortIcon field="modalidade" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('data_abertura')}
              >
                <div className="flex items-center gap-1">
                  Data Publicação
                  <SortIcon field="data_abertura" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('data_limite')}
              >
                <div className="flex items-center gap-1">
                  Data Encerramento
                  <SortIcon field="data_limite" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLicitacoes.map((lic) => (
              <TableRow 
                key={lic.id} 
                className="hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => onSelectDetail(lic)}
              >
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-primary/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDetail(lic);
                    }}
                  >
                    <Info className="w-4 h-4 text-primary" />
                  </Button>
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate" title={lic.orgao}>
                  {lic.orgao}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatNumero(lic.numero, lic.id)}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${statusColors[lic.status] || ''}`}>
                    {lic.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {lic.modalidade}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(lic.data_abertura)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(lic.data_limite)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount} processos
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-3 text-sm">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
