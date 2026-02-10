import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { BLLFiltersBar, BLLFiltersState } from '@/components/licitacao/BLLFiltersBar';
import { BLLTable } from '@/components/licitacao/BLLTable';
import { BLLMobileList } from '@/components/licitacao/BLLMobileList';
import { BLLMobileFiltersDrawer } from '@/components/licitacao/BLLMobileFiltersDrawer';
import { BLLDetailPanel } from '@/components/licitacao/BLLDetailPanel';
import { CaptureStatusIndicator } from '@/components/licitacao/CaptureStatusIndicator';
import { AISmartFilter } from '@/components/licitacao/AISmartFilter';
import { useLicitacoes, useLicitacoesRealtime, type Licitacao } from '@/hooks/useLicitacoes';
import { useLicitacoesRealtimeNotifications } from '@/hooks/useLicitacoesRealtimeNotifications';
import { useAutoCapture } from '@/hooks/useAutoCapture';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Download, 
  FileText,
  ShoppingCart,
  Briefcase,
  Pill,
  Building2,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Bot,
  Activity,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

type MainTabType = 'todos' | 'compras' | 'servicos';
type SegmentTabType = 'todos' | 'medicamentos' | 'empreendimentos';

const INITIAL_FILTERS: BLLFiltersState = {
  promotor: '',
  orgaoPagador: '',
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
  const [searchParams] = useSearchParams();
  
  // Read segment from URL query param (e.g., ?segmento=medicamentos)
  const initialSegment = (searchParams.get('segmento') as SegmentTabType) || 'todos';
  
  const [mainTab, setMainTab] = useState<MainTabType>('todos');
  const [segmentTab, setSegmentTab] = useState<SegmentTabType>(initialSegment);
  const [filters, setFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Sync segment tab with URL changes
  useEffect(() => {
    const seg = searchParams.get('segmento') as SegmentTabType;
    if (seg && ['medicamentos', 'empreendimentos'].includes(seg)) {
      setSegmentTab(seg);
    }
  }, [searchParams]);

  const { data: licitacoes, isLoading, refetch } = useLicitacoes();
  const { setupRealtime } = useLicitacoesRealtime();
  const { capture, isCapturing } = useAutoCapture();
  
  // Real-time notifications with sound
  useLicitacoesRealtimeNotifications({
    enableSound: true,
    enableToast: true,
    segmentoFilter: segmentTab === 'medicamentos' 
      ? 'Medicamentos' 
      : segmentTab === 'empreendimentos' 
        ? 'Empreendimentos' 
        : undefined,
  });

  // Extract unique órgãos pagadores from licitações for autocomplete
  const orgaosPagadores = useMemo(() => {
    if (!licitacoes) return [];
    const uniqueOrgaos = new Set(licitacoes.map(l => `${l.municipio}/${l.uf}`));
    return Array.from(uniqueOrgaos).sort();
  }, [licitacoes]);

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.promotor) count++;
    if (appliedFilters.orgaoPagador) count++;
    if (appliedFilters.numero) count++;
    if (appliedFilters.cidade) count++;
    if (appliedFilters.uf && appliedFilters.uf !== 'all') count++;
    if (appliedFilters.modalidade && appliedFilters.modalidade !== 'all') count++;
    if (appliedFilters.situacao && appliedFilters.situacao !== 'all') count++;
    if (appliedFilters.pubInicio) count++;
    if (appliedFilters.pubFim) count++;
    return count;
  }, [appliedFilters]);

  // Handle main tab change (Compras/Serviços)
  const handleMainTabChange = useCallback((tab: string) => {
    setMainTab(tab as MainTabType);
    setPage(1);
  }, []);

  // Handle segment tab change (Medicamentos/Empreendimentos)
  const handleSegmentTabChange = useCallback((tab: string) => {
    setSegmentTab(tab as SegmentTabType);
    setPage(1);
  }, []);

  // Filter licitacoes by type and segment
  const licitacoesFiltradas = useMemo(() => {
    if (!licitacoes) return [];
    let result = [...licitacoes];

    // Excluir licitações já autorizadas/participando (vão para "Minhas Participações")
    result = result.filter(l => 
      l.status !== 'Autorizada' && 
      l.status !== 'Em Disputa' && 
      l.status !== 'Vencida' && 
      l.status !== 'Perdida'
    );

    // Filter by main tab (Compras vs Serviços)
    if (mainTab === 'compras') {
      // Compras = Compra Direta, Dispensa sem Disputa
      result = result.filter(l => 
        l.modalidade === 'Compra Direta' || 
        l.modalidade === 'Dispensa sem Disputa'
      );
    } else if (mainTab === 'servicos') {
      // Serviços = Dispensa com Disputa
      result = result.filter(l => l.modalidade === 'Dispensa com Disputa');
    }

    // Filter by segment tab (Medicamentos vs Empreendimentos)
    if (segmentTab === 'medicamentos') {
      result = result.filter(l => l.segmento === 'Medicamentos');
    } else if (segmentTab === 'empreendimentos') {
      result = result.filter(l => l.segmento === 'Empreendimentos');
    }

    // Apply text filters
    if (appliedFilters.promotor) {
      const busca = appliedFilters.promotor.toLowerCase();
      result = result.filter(l => l.orgao.toLowerCase().includes(busca));
    }
    // Filtro por Órgão Pagador (municipio/uf)
    if (appliedFilters.orgaoPagador) {
      const busca = appliedFilters.orgaoPagador.toLowerCase();
      result = result.filter(l => 
        `${l.municipio}/${l.uf}`.toLowerCase().includes(busca) ||
        l.municipio.toLowerCase().includes(busca) ||
        l.uf.toLowerCase().includes(busca)
      );
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
    if (appliedFilters.modalidade && appliedFilters.modalidade !== 'all') {
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
  }, [licitacoes, appliedFilters, mainTab, segmentTab]);

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
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  const handleExportCSV = () => {
    const headers = ['Número', 'Portal', 'Órgão', 'Município', 'UF', 'Objeto', 'Valor', 'Modalidade', 'Segmento', 'Status', 'Data Abertura'];
    const rows = licitacoesFiltradas.map(l => [
      l.numero,
      l.portal,
      l.orgao,
      l.municipio,
      l.uf,
      l.objeto.replace(/,/g, ';'),
      l.valor,
      l.modalidade,
      l.segmento,
      l.status,
      new Date(l.data_abertura).toLocaleDateString('pt-BR')
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `licitacoes_${segmentTab}_${mainTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exportação CSV realizada!');
  };

  // Stats by segment
  const stats = useMemo(() => {
    const filtered = licitacoes || [];
    
    // Get counts for current segment
    const currentSegment = segmentTab === 'todos' 
      ? filtered 
      : filtered.filter(l => l.segmento === (segmentTab === 'medicamentos' ? 'Medicamentos' : 'Empreendimentos'));

    return {
      total: currentSegment.length,
      novas: currentSegment.filter(l => l.status === 'Nova').length,
      aguardando: currentSegment.filter(l => l.status === 'Aguardando Autorização').length,
      disputa: currentSegment.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada').length,
      vencidas: currentSegment.filter(l => l.status === 'Vencida').length,
      medicamentos: filtered.filter(l => l.segmento === 'Medicamentos').length,
      empreendimentos: filtered.filter(l => l.segmento === 'Empreendimentos').length,
      compras: filtered.filter(l => l.modalidade === 'Compra Direta' || l.modalidade === 'Dispensa sem Disputa').length,
      servicos: filtered.filter(l => l.modalidade === 'Dispensa com Disputa').length,
    };
  }, [licitacoes, segmentTab]);

  return (
    <MainLayout title="Portal de Licitações">
      <div className="space-y-4">
        {/* Auto Capture Status Indicator with AI 24/7 */}
        <CaptureStatusIndicator
          onCapture={capture}
          isCapturing={isCapturing}
          autoCapture={true}
          autoInterval={60}
        />

        {/* AI Smart Filter */}
        <AISmartFilter
          licitacoes={licitacoes || []}
          onSelectLicitacao={setSelectedLicitacao}
          segmento={segmentTab === 'medicamentos' ? 'Medicamentos' : segmentTab === 'empreendimentos' ? 'Empreendimentos' : undefined}
        />

        {/* Segment Tabs - Medicamentos vs Empreendimentos */}
        <div className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 border border-border rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">IA Captando 24/7 por Empresa</span>
            <div className="flex items-center gap-1 ml-auto">
              <Activity className="w-3 h-3 text-success animate-pulse" />
              <span className="text-xs text-success font-medium">Ativo</span>
            </div>
          </div>
          
          <Tabs value={segmentTab} onValueChange={handleSegmentTabChange}>
            <TabsList className="w-full grid grid-cols-3 bg-secondary/50">
              <TabsTrigger value="todos" className="gap-1.5 text-xs md:text-sm">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Todos</span>
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {stats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="medicamentos" className="gap-1.5 text-xs md:text-sm">
                <Pill className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Medicamentos</span>
                <span className="sm:hidden">Med.</span>
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 bg-primary/10 text-primary">
                  {stats.medicamentos}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="empreendimentos" className="gap-1.5 text-xs md:text-sm">
                <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Empreendimentos</span>
                <span className="sm:hidden">Emp.</span>
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 bg-accent/10 text-accent-foreground">
                  {stats.empreendimentos}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Type Tabs - Compras vs Serviços */}
        <div className="bg-card border border-border rounded-lg p-3 md:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Type Tabs */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <Tabs value={mainTab} onValueChange={handleMainTabChange}>
                <TabsList className="bg-secondary/50 min-w-max">
                  <TabsTrigger value="todos" className="gap-1.5 text-xs md:text-sm md:gap-2">
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Processos</span>
                    <span className="sm:hidden">Proc.</span>
                  </TabsTrigger>
                  <TabsTrigger value="compras" className="gap-1.5 text-xs md:text-sm md:gap-2">
                    <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Compras</span>
                    <span className="sm:hidden">Compras</span>
                    <Badge variant="outline" className="ml-1 text-xs px-1.5">
                      {stats.compras}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="servicos" className="gap-1.5 text-xs md:text-sm md:gap-2">
                    <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Serviços</span>
                    <span className="sm:hidden">Serv.</span>
                    <Badge variant="outline" className="ml-1 text-xs px-1.5">
                      {stats.servicos}
                    </Badge>
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
            orgaosPagadores={orgaosPagadores}
          />
        )}

        {/* Results count with active segment/type badges */}
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>{licitacoesFiltradas.length} processos</span>
          <div className="flex items-center gap-2 flex-wrap">
            {segmentTab !== 'todos' && (
              <Badge 
                variant="outline" 
                className={`text-xs ${segmentTab === 'medicamentos' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-accent/10 text-accent-foreground border-accent/20'}`}
              >
                {segmentTab === 'medicamentos' ? (
                  <>
                    <Pill className="w-3 h-3 mr-1" />
                    Medicamentos
                  </>
                ) : (
                  <>
                    <Building2 className="w-3 h-3 mr-1" />
                    Empreendimentos
                  </>
                )}
              </Badge>
            )}
            {mainTab !== 'todos' && (
              <Badge variant="outline" className="text-xs">
                {mainTab === 'compras' ? (
                  <>
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Compras
                  </>
                ) : (
                  <>
                    <Briefcase className="w-3 h-3 mr-1" />
                    Serviços
                  </>
                )}
              </Badge>
            )}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} filtros
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
