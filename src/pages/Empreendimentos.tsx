import { useState, useMemo, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { BLLFiltersBar, BLLFiltersState } from '@/components/licitacao/BLLFiltersBar';
import { BLLTable } from '@/components/licitacao/BLLTable';
import { BLLMobileList } from '@/components/licitacao/BLLMobileList';
import { BLLDetailPanel } from '@/components/licitacao/BLLDetailPanel';
import { CaptureStatusIndicator } from '@/components/licitacao/CaptureStatusIndicator';
import { useLicitacoes, useLicitacoesRealtime, type Licitacao } from '@/hooks/useLicitacoes';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';
import { useAutoCapture } from '@/hooks/useAutoCapture';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Building2, 
  TrendingUp, 
  FileText, 
  Clock, 
  MapPin, 
  Settings, 
  Download,
  CheckCircle,
  AlertCircle,
  Bot,
  Activity,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type MainTabType = 'todos' | 'compras' | 'servicos';

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

const Empreendimentos = () => {
  const isMobile = useIsMobile();
  const [mainTab, setMainTab] = useState<MainTabType>('todos');
  const [filters, setFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [page, setPage] = useState(1);
  
  const { data: licitacoesDB, isLoading, refetch } = useLicitacoes();
  const { setupRealtime } = useLicitacoesRealtime();
  const { data: configuracoes } = useConfiguracoes();
  const { capture, isCapturing } = useAutoCapture();

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  // Estados prioritários do usuário ou padrão
  const ufsPrioritarias = useMemo(() => {
    return configuracoes?.ufs_priorizadas && configuracoes.ufs_priorizadas.length > 0
      ? configuracoes.ufs_priorizadas
      : ['PA', 'TO', 'GO', 'MA'];
  }, [configuracoes]);

  // Extract unique órgãos pagadores for autocomplete
  const orgaosPagadores = useMemo(() => {
    if (!licitacoesDB) return [];
    const filtered = licitacoesDB.filter(l => l.segmento === 'Empreendimentos');
    const uniqueOrgaos = new Set(filtered.map(l => `${l.municipio}/${l.uf}`));
    return Array.from(uniqueOrgaos).sort();
  }, [licitacoesDB]);

  // Filter by segment and allowed states
  const empreendimentos = useMemo(() => {
    if (!licitacoesDB) return [];
    let result = licitacoesDB.filter(l => 
      l.segmento === 'Empreendimentos' && 
      ufsPrioritarias.includes(l.uf)
    );

    // Filter by main tab (Compras vs Serviços)
    if (mainTab === 'compras') {
      result = result.filter(l => 
        l.modalidade === 'Compra Direta' || 
        l.modalidade === 'Dispensa sem Disputa'
      );
    } else if (mainTab === 'servicos') {
      result = result.filter(l => l.modalidade === 'Dispensa com Disputa');
    }

    // Apply text filters
    if (appliedFilters.promotor) {
      const busca = appliedFilters.promotor.toLowerCase();
      result = result.filter(l => l.orgao.toLowerCase().includes(busca));
    }
    if (appliedFilters.orgaoPagador) {
      const busca = appliedFilters.orgaoPagador.toLowerCase();
      result = result.filter(l => 
        `${l.municipio}/${l.uf}`.toLowerCase().includes(busca) ||
        l.municipio.toLowerCase().includes(busca)
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
  }, [licitacoesDB, ufsPrioritarias, mainTab, appliedFilters]);

  // Paginated results
  const paginatedEmpreendimentos = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return empreendimentos.slice(start, start + PAGE_SIZE);
  }, [empreendimentos, page]);

  const stats = useMemo(() => {
    const all = licitacoesDB?.filter(l => 
      l.segmento === 'Empreendimentos' && 
      ufsPrioritarias.includes(l.uf)
    ) || [];
    
    return {
      total: all.length,
      valorTotal: all.reduce((acc, l) => acc + Number(l.valor), 0),
      novas: all.filter(l => l.status === 'Nova').length,
      aguardando: all.filter(l => l.status === 'Aguardando Autorização').length,
      disputa: all.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada').length,
      vencidas: all.filter(l => l.status === 'Vencida').length,
      compras: all.filter(l => l.modalidade === 'Compra Direta' || l.modalidade === 'Dispensa sem Disputa').length,
      servicos: all.filter(l => l.modalidade === 'Dispensa com Disputa').length,
      porUf: ufsPrioritarias.reduce((acc, uf) => {
        acc[uf] = all.filter(l => l.uf === uf).length;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [licitacoesDB, ufsPrioritarias]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: value >= 1000000 ? 'compact' : 'standard',
    }).format(value);
  };

  const handleBuscar = useCallback(() => {
    setAppliedFilters(filters);
    setPage(1);
  }, [filters]);

  const handleLimpar = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  const handleMainTabChange = useCallback((tab: string) => {
    setMainTab(tab as MainTabType);
    setPage(1);
  }, []);

  const handleExportCSV = () => {
    const headers = ['Número', 'Portal', 'Órgão', 'Órgão Pagador', 'Objeto', 'Valor', 'Modalidade', 'Status', 'Data Abertura'];
    const rows = empreendimentos.map(l => [
      l.numero,
      l.portal,
      l.orgao,
      `${l.municipio}/${l.uf}`,
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
    link.download = `empreendimentos_${mainTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exportação CSV realizada!');
  };

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

  return (
    <MainLayout title="Empreendimentos">
      <div className="space-y-4">
        {/* Auto Capture Status */}
        <CaptureStatusIndicator
          onCapture={capture}
          isCapturing={isCapturing}
          autoCapture={true}
          autoInterval={60}
        />

        {/* Header with AI 24/7 Badge */}
        <div className="bg-gradient-to-r from-emerald-50 via-transparent to-accent/5 border border-emerald-200 rounded-xl p-4 md:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <Building2 className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  Empreendimentos
                  <div className="flex items-center gap-1.5 bg-emerald-100 rounded-full px-2.5 py-1">
                    <Bot className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-xs font-semibold text-emerald-700">IA 24/7</span>
                  </div>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Obras, serviços de engenharia e construção civil
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-success/10 rounded-full px-3 py-1.5">
                <Activity className="w-3.5 h-3.5 text-success animate-pulse" />
                <span className="text-xs text-success font-semibold">Captando</span>
              </div>
              <Link to="/configuracoes">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Estados</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* States Banner */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-sm text-foreground">
              Estados Prioritários ({ufsPrioritarias.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ufsPrioritarias.map(uf => (
              <Badge 
                key={uf} 
                variant="secondary" 
                className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                {uf}: {stats.porUf[uf] || 0}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(stats.valorTotal)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aguardando</p>
                <p className="text-xl font-bold">{stats.aguardando}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencidas</p>
                <p className="text-xl font-bold">{stats.vencidas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Type Tabs - Compras vs Serviços */}
        <div className="bg-card border border-border rounded-lg p-3 md:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={mainTab} onValueChange={handleMainTabChange}>
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="todos" className="gap-1.5 text-xs md:text-sm">
                  <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="compras" className="gap-1.5 text-xs md:text-sm">
                  Compras
                  <Badge variant="outline" className="ml-1 text-xs px-1.5">
                    {stats.compras}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="servicos" className="gap-1.5 text-xs md:text-sm">
                  Serviços
                  <Badge variant="outline" className="ml-1 text-xs px-1.5">
                    {stats.servicos}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Online
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="w-4 h-4 text-accent" />
                {stats.novas} Novas
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                {stats.disputa} Em Disputa
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Filters Bar */}
        {!isMobile && (
          <BLLFiltersBar
            filters={filters}
            onFilterChange={setFilters}
            onBuscar={handleBuscar}
            onLimpar={handleLimpar}
            orgaosPagadores={orgaosPagadores}
          />
        )}

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>{empreendimentos.length} processos de empreendimentos</span>
          <div className="flex items-center gap-2">
            {mainTab !== 'todos' && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                {mainTab === 'compras' ? 'Compras' : 'Serviços'}
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
            licitacoes={paginatedEmpreendimentos}
            onSelectDetail={setSelectedLicitacao}
            isLoading={isLoading}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={empreendimentos.length}
            onPageChange={setPage}
          />
        ) : (
          <BLLTable
            licitacoes={paginatedEmpreendimentos}
            onSelectDetail={setSelectedLicitacao}
            isLoading={isLoading}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={empreendimentos.length}
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

export default Empreendimentos;
