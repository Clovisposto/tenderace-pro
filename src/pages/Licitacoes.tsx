import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FiltrosLicitacao } from '@/components/licitacao/FiltrosLicitacao';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalhe } from '@/components/licitacao/LicitacaoDetalhe';
import { mockLicitacoes } from '@/data/mockData';
import { Licitacao } from '@/types/licitacao';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Licitacoes = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [filtros, setFiltros] = useState<any>({});
  const [activeTab, setActiveTab] = useState('todas');

  const licitacoesFiltradas = useMemo(() => {
    let result = [...mockLicitacoes];

    // Filter by tab
    if (activeTab === 'novas') {
      result = result.filter(l => l.status === 'Nova');
    } else if (activeTab === 'analise') {
      result = result.filter(l => l.status === 'Em Análise');
    } else if (activeTab === 'aguardando') {
      result = result.filter(l => l.status === 'Aguardando Autorização');
    } else if (activeTab === 'disputa') {
      result = result.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada');
    }

    // Apply filters
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
  }, [activeTab, filtros]);

  const counts = useMemo(() => ({
    todas: mockLicitacoes.length,
    novas: mockLicitacoes.filter(l => l.status === 'Nova').length,
    analise: mockLicitacoes.filter(l => l.status === 'Em Análise').length,
    aguardando: mockLicitacoes.filter(l => l.status === 'Aguardando Autorização').length,
    disputa: mockLicitacoes.filter(l => l.status === 'Em Disputa' || l.status === 'Autorizada').length,
  }), []);

  return (
    <MainLayout title="Licitações">
      <div className="space-y-6">
        <FiltrosLicitacao onFilterChange={setFiltros} />

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
            {licitacoesFiltradas.length > 0 ? (
              <div className="space-y-4">
                {licitacoesFiltradas.map((licitacao, index) => (
                  <LicitacaoCard
                    key={licitacao.id}
                    licitacao={licitacao}
                    onClick={() => setSelectedLicitacao(licitacao)}
                    delay={index * 50}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <p className="text-muted-foreground">Nenhuma licitação encontrada com os filtros selecionados.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedLicitacao && (
        <LicitacaoDetalhe
          licitacao={selectedLicitacao}
          onClose={() => setSelectedLicitacao(null)}
          onAutorizar={() => setSelectedLicitacao(null)}
        />
      )}
    </MainLayout>
  );
};

export default Licitacoes;
