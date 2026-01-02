import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FiltrosLicitacao } from '@/components/licitacao/FiltrosLicitacao';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalhe } from '@/components/licitacao/LicitacaoDetalhe';
import { useLicitacoes, useLicitacoesRealtime, useCapturarPNCP, type Licitacao } from '@/hooks/useLicitacoes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Licitacoes = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [filtros, setFiltros] = useState<any>({});
  const [activeTab, setActiveTab] = useState('todas');

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

    if (activeTab === 'novas') {
      result = result.filter(l => l.status === 'Nova');
    } else if (activeTab === 'analise') {
      result = result.filter(l => l.status === 'Em Análise');
    } else if (activeTab === 'aguardando') {
      result = result.filter(l => l.status === 'Aguardando Autorização');
    } else if (activeTab === 'disputa') {
      result = result.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada');
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      result = result.filter(l =>
        l.objeto.toLowerCase().includes(busca) ||
        l.orgao.toLowerCase().includes(busca) ||
        l.municipio.toLowerCase().includes(busca)
      );
    }

    if (filtros.portais?.length > 0) {
      result = result.filter(l => filtros.portais.includes(l.portal));
    }

    if (filtros.modalidades?.length > 0) {
      result = result.filter(l => filtros.modalidades.includes(l.modalidade));
    }

    if (filtros.ufs?.length > 0) {
      result = result.filter(l => filtros.ufs.includes(l.uf));
    }

    return result;
  }, [activeTab, filtros, licitacoes]);

  const counts = useMemo(() => ({
    todas: licitacoes?.length || 0,
    novas: licitacoes?.filter(l => l.status === 'Nova').length || 0,
    analise: licitacoes?.filter(l => l.status === 'Em Análise').length || 0,
    aguardando: licitacoes?.filter(l => l.status === 'Aguardando Autorização').length || 0,
    disputa: licitacoes?.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada').length || 0,
  }), [licitacoes]);

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

  return (
    <MainLayout title="Licitações">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <FiltrosLicitacao onFilterChange={setFiltros} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => capturarPNCP.mutate()}
              disabled={capturarPNCP.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${capturarPNCP.isPending ? 'animate-spin' : ''}`} />
              Capturar PNCP
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="todas">
              Todas <span className="ml-2 text-xs opacity-70">({counts.todas})</span>
            </TabsTrigger>
            <TabsTrigger value="novas">
              Novas <span className="ml-2 text-xs opacity-70">({counts.novas})</span>
            </TabsTrigger>
            <TabsTrigger value="analise">
              Em Análise <span className="ml-2 text-xs opacity-70">({counts.analise})</span>
            </TabsTrigger>
            <TabsTrigger value="aguardando">
              Aguardando <span className="ml-2 text-xs opacity-70">({counts.aguardando})</span>
            </TabsTrigger>
            <TabsTrigger value="disputa">
              Em Disputa <span className="ml-2 text-xs opacity-70">({counts.disputa})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : licitacoesFiltradas.length > 0 ? (
              <div className="space-y-4">
                {licitacoesFiltradas.map((licitacao, index) => (
                  <LicitacaoCard
                    key={licitacao.id}
                    licitacao={mapToLegacyFormat(licitacao)}
                    onClick={() => setSelectedLicitacao(licitacao)}
                    delay={index * 50}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <p className="text-muted-foreground">Nenhuma licitação encontrada.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => capturarPNCP.mutate()}
                  disabled={capturarPNCP.isPending}
                >
                  Capturar novas licitações
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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

export default Licitacoes;
