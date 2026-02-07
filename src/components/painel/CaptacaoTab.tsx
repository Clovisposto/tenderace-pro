import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Download, FileText, ShoppingCart, Briefcase, Pill, Building2, Bot, Activity } from 'lucide-react';
import { toast } from 'sonner';

type MainTabType = 'todos' | 'compras' | 'servicos';
type SegmentTabType = 'todos' | 'medicamentos' | 'empreendimentos';

const INITIAL_FILTERS: BLLFiltersState = {
  promotor: '', orgaoPagador: '', numero: '', cidade: '', uf: '', modalidade: '', situacao: '',
  pubInicio: undefined, pubFim: undefined,
};

const PAGE_SIZE = 20;

export function CaptacaoTab() {
  const isMobile = useIsMobile();
  const [mainTab, setMainTab] = useState<MainTabType>('todos');
  const [segmentTab, setSegmentTab] = useState<SegmentTabType>('todos');
  const [filters, setFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BLLFiltersState>(INITIAL_FILTERS);
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: licitacoes, isLoading } = useLicitacoes();
  const { setupRealtime } = useLicitacoesRealtime();
  const { capture, isCapturing } = useAutoCapture();

  useLicitacoesRealtimeNotifications({
    enableSound: true, enableToast: true,
    segmentoFilter: segmentTab === 'medicamentos' ? 'Medicamentos' : segmentTab === 'empreendimentos' ? 'Empreendimentos' : undefined,
  });

  const orgaosPagadores = useMemo(() => {
    if (!licitacoes) return [];
    return Array.from(new Set(licitacoes.map(l => `${l.municipio}/${l.uf}`))).sort();
  }, [licitacoes]);

  useEffect(() => { const cleanup = setupRealtime(); return cleanup; }, []);

  const licitacoesFiltradas = useMemo(() => {
    if (!licitacoes) return [];
    let result = licitacoes.filter(l => !['Autorizada','Em Disputa','Vencida','Perdida'].includes(l.status));
    if (mainTab === 'compras') result = result.filter(l => l.modalidade === 'Compra Direta' || l.modalidade === 'Dispensa sem Disputa');
    else if (mainTab === 'servicos') result = result.filter(l => l.modalidade === 'Dispensa com Disputa');
    if (segmentTab === 'medicamentos') result = result.filter(l => l.segmento === 'Medicamentos');
    else if (segmentTab === 'empreendimentos') result = result.filter(l => l.segmento === 'Empreendimentos');
    if (appliedFilters.promotor) { const b = appliedFilters.promotor.toLowerCase(); result = result.filter(l => l.orgao.toLowerCase().includes(b)); }
    if (appliedFilters.orgaoPagador) { const b = appliedFilters.orgaoPagador.toLowerCase(); result = result.filter(l => `${l.municipio}/${l.uf}`.toLowerCase().includes(b)); }
    if (appliedFilters.numero) result = result.filter(l => l.numero.toLowerCase().includes(appliedFilters.numero.toLowerCase()));
    if (appliedFilters.cidade) result = result.filter(l => l.municipio.toLowerCase().includes(appliedFilters.cidade.toLowerCase()));
    if (appliedFilters.uf && appliedFilters.uf !== 'all') result = result.filter(l => l.uf === appliedFilters.uf);
    if (appliedFilters.modalidade && appliedFilters.modalidade !== 'all') result = result.filter(l => l.modalidade === appliedFilters.modalidade);
    if (appliedFilters.situacao && appliedFilters.situacao !== 'all') result = result.filter(l => l.status === appliedFilters.situacao);
    return result;
  }, [licitacoes, appliedFilters, mainTab, segmentTab]);

  const paginatedLicitacoes = useMemo(() => licitacoesFiltradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [licitacoesFiltradas, page]);
  const activeFiltersCount = useMemo(() => Object.entries(appliedFilters).filter(([k, v]) => v && v !== 'all' && v !== '').length, [appliedFilters]);

  const handleBuscar = useCallback(() => { setAppliedFilters(filters); setPage(1); }, [filters]);
  const handleLimpar = useCallback(() => { setFilters(INITIAL_FILTERS); setAppliedFilters(INITIAL_FILTERS); setPage(1); }, []);

  const handleExportCSV = () => {
    const headers = ['Número','Portal','Órgão','Município','UF','Objeto','Valor','Modalidade','Segmento','Status'];
    const rows = licitacoesFiltradas.map(l => [l.numero,l.portal,l.orgao,l.municipio,l.uf,l.objeto.replace(/,/g,';'),l.valor,l.modalidade,l.segmento,l.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `licitacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exportação CSV realizada!');
  };

  const stats = useMemo(() => {
    const all = licitacoes || [];
    return {
      total: all.length,
      medicamentos: all.filter(l => l.segmento === 'Medicamentos').length,
      empreendimentos: all.filter(l => l.segmento === 'Empreendimentos').length,
      compras: all.filter(l => l.modalidade === 'Compra Direta' || l.modalidade === 'Dispensa sem Disputa').length,
      servicos: all.filter(l => l.modalidade === 'Dispensa com Disputa').length,
    };
  }, [licitacoes]);

  return (
    <div className="space-y-4">
      <CaptureStatusIndicator onCapture={capture} isCapturing={isCapturing} autoCapture autoInterval={60} />
      <AISmartFilter licitacoes={licitacoes || []} onSelectLicitacao={setSelectedLicitacao} segmento={segmentTab === 'medicamentos' ? 'Medicamentos' : segmentTab === 'empreendimentos' ? 'Empreendimentos' : undefined} />

      {/* Segment Tabs */}
      <div className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">IA Captando 24/7</span>
          <div className="flex items-center gap-1 ml-auto"><Activity className="w-3 h-3 text-green-500 animate-pulse" /><span className="text-xs text-green-600 font-medium">Ativo</span></div>
        </div>
        <Tabs value={segmentTab} onValueChange={v => { setSegmentTab(v as SegmentTabType); setPage(1); }}>
          <TabsList className="w-full grid grid-cols-3 bg-secondary/50">
            <TabsTrigger value="todos" className="gap-1.5 text-xs md:text-sm"><FileText className="w-3.5 h-3.5" />Todos <Badge variant="secondary" className="ml-1 text-xs">{stats.total}</Badge></TabsTrigger>
            <TabsTrigger value="medicamentos" className="gap-1.5 text-xs md:text-sm"><Pill className="w-3.5 h-3.5" />Med. <Badge variant="secondary" className="ml-1 text-xs">{stats.medicamentos}</Badge></TabsTrigger>
            <TabsTrigger value="empreendimentos" className="gap-1.5 text-xs md:text-sm"><Building2 className="w-3.5 h-3.5" />Emp. <Badge variant="secondary" className="ml-1 text-xs">{stats.empreendimentos}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Type Tabs + Actions */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={mainTab} onValueChange={v => { setMainTab(v as MainTabType); setPage(1); }}>
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="todos" className="gap-1.5 text-xs md:text-sm"><FileText className="w-3.5 h-3.5" />Processos</TabsTrigger>
              <TabsTrigger value="compras" className="gap-1.5 text-xs md:text-sm"><ShoppingCart className="w-3.5 h-3.5" />Compras <Badge variant="outline" className="ml-1 text-xs">{stats.compras}</Badge></TabsTrigger>
              <TabsTrigger value="servicos" className="gap-1.5 text-xs md:text-sm"><Briefcase className="w-3.5 h-3.5" />Serviços <Badge variant="outline" className="ml-1 text-xs">{stats.servicos}</Badge></TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            {isMobile && <BLLMobileFiltersDrawer filters={filters} onFilterChange={setFilters} onBuscar={handleBuscar} onLimpar={handleLimpar} open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} activeFiltersCount={activeFiltersCount} />}
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5"><Download className="w-4 h-4" /><span className="hidden sm:inline">Exportar</span></Button>
          </div>
        </div>
      </div>

      {!isMobile && <BLLFiltersBar filters={filters} onFilterChange={setFilters} onBuscar={handleBuscar} onLimpar={handleLimpar} orgaosPagadores={orgaosPagadores} />}

      <div className="text-sm text-muted-foreground px-1">{licitacoesFiltradas.length} processos encontrados</div>

      {isMobile ? (
        <BLLMobileList licitacoes={paginatedLicitacoes} onSelectDetail={setSelectedLicitacao} isLoading={isLoading} page={page} pageSize={PAGE_SIZE} totalCount={licitacoesFiltradas.length} onPageChange={setPage} />
      ) : (
        <BLLTable licitacoes={paginatedLicitacoes} onSelectDetail={setSelectedLicitacao} isLoading={isLoading} page={page} pageSize={PAGE_SIZE} totalCount={licitacoesFiltradas.length} onPageChange={setPage} />
      )}

      <BLLDetailPanel licitacao={selectedLicitacao} onClose={() => setSelectedLicitacao(null)} />
    </div>
  );
}
