import { useState, useMemo, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { BLLFiltersBar, BLLFiltersState } from '@/components/licitacao/BLLFiltersBar';
import { BLLTable } from '@/components/licitacao/BLLTable';
import { BLLMobileList } from '@/components/licitacao/BLLMobileList';
import { BLLMobileFiltersDrawer } from '@/components/licitacao/BLLMobileFiltersDrawer';
import { BLLDetailPanel } from '@/components/licitacao/BLLDetailPanel';
import { useLicitacoes, useLicitacoesRealtime, useCapturarPNCP, type Licitacao } from '@/hooks/useLicitacoes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  RefreshCw, 
  Download, 
  FileText,
  ShoppingCart,
  MapPin,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

type TabType = 'processos' | 'compra_direta' | 'localizacao';

const INITIAL_FILTERS: BLLFiltersState = {
  promotor: '',
  numero: '',
  cidade: '',
  uf: '',
  modalidade: '',
  situacao: '',
  pubInicio: undefined,
  pubFim: undefined,
};

const PAGE_SIZE = 20;

const LicitacoesPortal = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabType>('processos');
  const [filters, setFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: licitacoes, isLoading, refetch } = useLicitacoes();
  const { setupRealtime } = useLicitacoesRealtime();
  const capturarPNCP = useCapturarPNCP();

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.promotor) count++;
    if (appliedFilters.numero) count++;
    if (appliedFilters.cidade) count++;
    if (appliedFilters.uf && appliedFilters.uf !== 'all') count++;
    if (appliedFilters.modalidade && appliedFilters.modalidade !== 'all') count++;
    if (appliedFilters.situacao && appliedFilters.situacao !== 'all') count++;
    if (appliedFilters.pubInicio) count++;
    if (appliedFilters.pubFim) count++;
    return count;
  }, [appliedFilters]);

  // Apply tab presets
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as TabType);
    setPage(1);
    
    if (tab === 'compra_direta') {
      setFilters({ ...INITIAL_FILTERS, modalidade: 'Compra Direta' });
      setAppliedFilters({ ...INITIAL_FILTERS, modalidade: 'Compra Direta' });
    } else if (tab === 'localizacao') {
      setFilters({ ...INITIAL_FILTERS });
      setAppliedFilters({ ...INITIAL_FILTERS });
    } else {
      setFilters(INITIAL_FILTERS);
      setAppliedFilters(INITIAL_FILTERS);
    }
  }, []);

  // Filter licitacoes
  const licitacoesFiltradas = useMemo(() => {
    if (!licitacoes) return [];
    let result = [...licitacoes];

    if (activeTab === 'compra_direta') {
      result = result.filter(l => l.modalidade === 'Compra Direta');
    }

    if (appliedFilters.promotor) {
      const busca = appliedFilters.promotor.toLowerCase();
      result = result.filter(l => l.orgao.toLowerCase().includes(busca));
    }
    if (appliedFilters.numero) {
      const busca = appliedFilters.numero.toLowerCase();
      result = result.filter(l => l.numero.toLowerCase().includes(busca));
    }
    if (appliedFilters.cidade) {
      const busca = appliedFilters.cidade.toLowerCase();
      result = result.filter(l => l.municipio.toLowerCase().includes(busca));
    }
    if (appliedFilters.uf && appliedFilters.uf !== 'all') {
      result = result.filter(l => l.uf === appliedFilters.uf);
    }
    if (appliedFilters.modalidade && appliedFilters.modalidade !== 'all' && activeTab !== 'compra_direta') {
      result = result.filter(l => l.modalidade === appliedFilters.modalidade);
    }
    if (appliedFilters.situacao && appliedFilters.situacao !== 'all') {
      result = result.filter(l => l.status === appliedFilters.situacao);
    }
    if (appliedFilters.pubInicio) {
      result = result.filter(l => new Date(l.data_abertura) >= appliedFilters.pubInicio!);
    }
    if (appliedFilters.pubFim) {
      result = result.filter(l => new Date(l.data_abertura) <= appliedFilters.pubFim!);
    }

    return result;
  }, [licitacoes, appliedFilters, activeTab]);

  // Paginated results
  const paginatedLicitacoes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return licitacoesFiltradas.slice(start, start + PAGE_SIZE);
  }, [licitacoesFiltradas, page]);

  const handleBuscar = useCallback(() => {
    setAppliedFilters(filters);
    setPage(1);
  }, [filters]);

  const handleLimpar = useCallback(() => {
    const baseFilters = activeTab === 'compra_direta' 
      ? { ...INITIAL_FILTERS, modalidade: 'Compra Direta' }
      : INITIAL_FILTERS;
    setFilters(baseFilters);
    setAppliedFilters(baseFilters);
    setPage(1);
  }, [activeTab]);

  const handleExportCSV = () => {
    const headers = ['Número', 'Portal', 'Órgão', 'Município', 'UF', 'Objeto', 'Valor', 'Modalidade', 'Status', 'Data Abertura'];
    const rows = licitacoesFiltradas.map(l => [
      l.numero,
      l.portal,
      l.orgao,
      l.municipio,
      l.uf,
      l.objeto.replace(/,/g, ';'),
      l.valor,
      l.modalidade,
      l.status,
      new Date(l.data_abertura).toLocaleDateString('pt-BR')
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `licitacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exportação CSV realizada!');
  };

  // Stats
  const stats = useMemo(() => ({
    total: licitacoes?.length || 0,
    novas: licitacoes?.filter(l => l.status === 'Nova').length || 0,
    aguardando: licitacoes?.filter(l => l.status === 'Aguardando Autorização').length || 0,
    disputa: licitacoes?.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada').length || 0,
    vencidas: licitacoes?.filter(l => l.status === 'Vencida').length || 0,
  }), [licitacoes]);

  return (
    <MainLayout title="Portal de Licitações">
      <div className="space-y-4">
        {/* Header with Tabs */}
        <div className="bg-card border border-border rounded-lg p-3 md:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Tabs - Scrollable on mobile */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="bg-secondary/50 min-w-max">
                  <TabsTrigger value="processos" className="gap-1.5 text-xs md:text-sm md:gap-2">
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Processos</span>
                    <span className="sm:hidden">Proc.</span>
                  </TabsTrigger>
                  <TabsTrigger value="compra_direta" className="gap-1.5 text-xs md:text-sm md:gap-2">
                    <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Compra Direta</span>
                    <span className="sm:hidden">C. Direta</span>
                  </TabsTrigger>
                  <TabsTrigger value="localizacao" className="gap-1.5 text-xs md:text-sm md:gap-2">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Busca por Localização</span>
                    <span className="sm:hidden">Local</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Stats - Hidden on mobile, visible on larger screens */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>Online</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="w-4 h-4 text-accent" />
                <span>{stats.novas} Novas</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4 text-warning" />
                <span>{stats.aguardando} Aguardando</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                <span>{stats.disputa} Em Disputa</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>{stats.vencidas} Vencidas</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile Filters Button */}
              {isMobile && (
                <BLLMobileFiltersDrawer
                  filters={filters}
                  onFilterChange={setFilters}
                  onBuscar={handleBuscar}
                  onLimpar={handleLimpar}
                  open={mobileFiltersOpen}
                  onOpenChange={setMobileFiltersOpen}
                  activeFiltersCount={activeFiltersCount}
                />
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 md:gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => capturarPNCP.mutate()}
                disabled={capturarPNCP.isPending}
                className="gap-1.5 md:gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${capturarPNCP.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Capturar PNCP</span>
                <span className="sm:hidden">Capturar</span>
              </Button>
            </div>
          </div>

          {/* Mobile Stats Row */}
          <div className="flex lg:hidden items-center gap-3 mt-3 pt-3 border-t border-border overflow-x-auto text-xs">
            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              Online
            </div>
            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <AlertCircle className="w-3 h-3 text-accent" />
              {stats.novas}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <Clock className="w-3 h-3 text-warning" />
              {stats.aguardando}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <Zap className="w-3 h-3 text-primary" />
              {stats.disputa}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <CheckCircle className="w-3 h-3 text-success" />
              {stats.vencidas}
            </div>
          </div>
        </div>

        {/* Desktop Filters Bar - Hidden on mobile */}
        {!isMobile && (
          <BLLFiltersBar
            filters={filters}
            onFilterChange={setFilters}
            onBuscar={handleBuscar}
            onLimpar={handleLimpar}
          />
        )}

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>{licitacoesFiltradas.length} processos</span>
          <div className="flex items-center gap-2">
            {activeTab === 'compra_direta' && (
              <Badge variant="outline" className="text-xs">
                Compra Direta
              </Badge>
            )}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} filtros ativos
              </Badge>
            )}
          </div>
        </div>

        {/* Table / List */}
        {isMobile ? (
          <BLLMobileList
            licitacoes={paginatedLicitacoes}
            onSelectDetail={setSelectedLicitacao}
            isLoading={isLoading}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={licitacoesFiltradas.length}
            onPageChange={setPage}
          />
        ) : (
          <BLLTable
            licitacoes={paginatedLicitacoes}
            onSelectDetail={setSelectedLicitacao}
            isLoading={isLoading}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={licitacoesFiltradas.length}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Detail Panel */}
      <BLLDetailPanel
        licitacao={selectedLicitacao}
        onClose={() => setSelectedLicitacao(null)}
      />
    </MainLayout>
  );
};

export default LicitacoesPortal;
