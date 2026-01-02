import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FiltrosSidebar, FiltrosState } from '@/components/licitacao/FiltrosSidebar';
import { LicitacaoTableView } from '@/components/licitacao/LicitacaoTableView';
import { LicitacaoDetalhe } from '@/components/licitacao/LicitacaoDetalhe';
import { useLicitacoes, useLicitacoesRealtime, useCapturarPNCP, type Licitacao } from '@/hooks/useLicitacoes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Download, 
  LayoutGrid, 
  Table as TableIcon,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';

const LicitacoesPortal = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filtros, setFiltros] = useState<FiltrosState>({
    busca: '',
    portais: [],
    modalidades: [],
    ufs: [],
    segmentos: [],
    valorMin: 1000,
    valorMax: 35000,
    status: []
  });

  const { data: licitacoes, isLoading, refetch } = useLicitacoes();
  const { setupRealtime } = useLicitacoesRealtime();
  const capturarPNCP = useCapturarPNCP();

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  const licitacoesFiltradas = useMemo(() => {
    if (!licitacoes) return [];
    let result = [...licitacoes];

    // Busca textual
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      result = result.filter(l =>
        l.objeto.toLowerCase().includes(busca) ||
        l.orgao.toLowerCase().includes(busca) ||
        l.municipio.toLowerCase().includes(busca) ||
        l.numero.toLowerCase().includes(busca)
      );
    }

    // Portais
    if (filtros.portais.length > 0) {
      result = result.filter(l => filtros.portais.includes(l.portal));
    }

    // Modalidades
    if (filtros.modalidades.length > 0) {
      result = result.filter(l => filtros.modalidades.includes(l.modalidade));
    }

    // UFs
    if (filtros.ufs.length > 0) {
      result = result.filter(l => filtros.ufs.includes(l.uf));
    }

    // Segmentos
    if (filtros.segmentos.length > 0) {
      result = result.filter(l => filtros.segmentos.includes(l.segmento));
    }

    // Status
    if (filtros.status.length > 0) {
      result = result.filter(l => filtros.status.includes(l.status));
    }

    // Valor
    result = result.filter(l => l.valor >= filtros.valorMin && l.valor <= filtros.valorMax);

    return result;
  }, [filtros, licitacoes]);

  const mapToLegacyFormat = (l: Licitacao) => ({
    id: l.id,
    portal: l.portal,
    numero: l.numero,
    orgao: l.orgao,
    uasg: l.uasg || undefined,
    municipio: l.municipio,
    uf: l.uf,
    objeto: l.objeto,
    objetoResumido: l.objeto_resumido || l.objeto.substring(0, 60) + '...',
    valor: l.valor,
    modalidade: l.modalidade,
    dataAbertura: new Date(l.data_abertura),
    dataLimite: new Date(l.data_limite),
    status: l.status,
    segmento: l.segmento,
    compliance: 'Apta' as const,
    roiScore: l.roi_score || 70,
    riscoScore: l.risco_score || 20,
    createdAt: new Date(l.created_at),
    updatedAt: new Date(l.updated_at),
  });

  const counts = useMemo(() => ({
    total: licitacoes?.length || 0,
    novas: licitacoes?.filter(l => l.status === 'Nova').length || 0,
    analise: licitacoes?.filter(l => l.status === 'Em Análise').length || 0,
    aguardando: licitacoes?.filter(l => l.status === 'Aguardando Autorização').length || 0,
    disputa: licitacoes?.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada').length || 0,
    vencidas: licitacoes?.filter(l => l.status === 'Vencida').length || 0,
  }), [licitacoes]);

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
    toast.success('Exportação CSV realizada com sucesso!');
  };

  return (
    <MainLayout title="Portal de Licitações">
      <div className="space-y-4">
        {/* Header com estatísticas rápidas */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium">Sistema Online</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-accent" />
                  <span>{counts.novas} Novas</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4 text-warning" />
                  <span>{counts.aguardando} Aguardando</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>{counts.disputa} Em Disputa</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{counts.vencidas} Vencidas</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center border border-border/50 rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => capturarPNCP.mutate()}
                disabled={capturarPNCP.isPending}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${capturarPNCP.isPending ? 'animate-spin' : ''}`} />
                Capturar PNCP
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Sidebar Filtros */}
          <FiltrosSidebar
            filtros={filtros}
            onFilterChange={setFiltros}
            totalResultados={licitacoesFiltradas.length}
          />

          {/* Lista de Licitações */}
          <div className="flex-1 min-w-0">
            {viewMode === 'table' ? (
              <LicitacaoTableView
                licitacoes={licitacoesFiltradas.map(mapToLegacyFormat)}
                onSelect={(l) => {
                  const original = licitacoes?.find(lic => lic.id === l.id);
                  if (original) setSelectedLicitacao(original);
                }}
                isLoading={isLoading}
              />
            ) : (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="glass-card p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando licitações...</p>
                  </div>
                ) : licitacoesFiltradas.length > 0 ? (
                  licitacoesFiltradas.map((licitacao, index) => (
                    <LicitacaoCard
                      key={licitacao.id}
                      licitacao={mapToLegacyFormat(licitacao)}
                      onClick={() => setSelectedLicitacao(licitacao)}
                      delay={index * 50}
                    />
                  ))
                ) : (
                  <div className="glass-card p-12 text-center">
                    <p className="text-muted-foreground mb-4">Nenhuma licitação encontrada.</p>
                    <Button onClick={() => capturarPNCP.mutate()} disabled={capturarPNCP.isPending}>
                      Capturar novas licitações
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLicitacao && (
        <LicitacaoDetalhe
          licitacao={mapToLegacyFormat(selectedLicitacao)}
          onClose={() => setSelectedLicitacao(null)}
          onAutorizar={() => setSelectedLicitacao(null)}
        />
      )}
    </MainLayout>
  );
};

export default LicitacoesPortal;