import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FiltrosLicitacao } from '@/components/licitacao/FiltrosLicitacao';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalheCompleto } from '@/components/licitacao/LicitacaoDetalheCompleto';
import { useLicitacoes, useLicitacoesRealtime, useCapturarPNCP, type Licitacao } from '@/hooks/useLicitacoes';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, MapPin, Zap, Globe, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

const Licitacoes = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [filtros, setFiltros] = useState<any>({});
  const [activeTab, setActiveTab] = useState('todas');
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: licitacoes, isLoading, refetch } = useLicitacoes();
  const { data: configuracoes } = useConfiguracoes();
  const { setupRealtime } = useLicitacoesRealtime();
  const capturarPNCP = useCapturarPNCP();
  const queryClient = useQueryClient();

  // Auto-open latest licitação when navigated with ?highlight=latest
  useEffect(() => {
    if (searchParams.get('highlight') === 'latest' && licitacoes && licitacoes.length > 0 && !selectedLicitacao) {
      const latest = [...licitacoes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      if (latest) setSelectedLicitacao(latest);
      searchParams.delete('highlight');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, licitacoes, selectedLicitacao, setSearchParams]);

  // Estados prioritários do usuário ou padrão
  const ufsPrioritarias = useMemo(() => {
    return configuracoes?.ufs_priorizadas && configuracoes.ufs_priorizadas.length > 0
      ? configuracoes.ufs_priorizadas
      : ['PA', 'TO', 'GO', 'MA'];
  }, [configuracoes]);

  // Mutation para capturar de todos os portais
  const capturarMultiportal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('capturar-multiportal', {
        body: { ufs: ufsPrioritarias }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Capturadas ${data?.total || 0} licitações de ${data?.results?.length || 0} portais`, {
        description: `Estados: ${data?.ufs?.join(', ') || 'Todos'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (error) => {
      toast.error('Erro ao capturar licitações');
      console.error(error);
    }
  });

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  const licitacoesFiltradas = useMemo(() => {
    if (!licitacoes) return [];
    let result = [...licitacoes];

    // Filtrar apenas estados prioritários do usuário
    if (ufsPrioritarias.length > 0) {
      result = result.filter(l => ufsPrioritarias.includes(l.uf));
    }

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
  }, [activeTab, filtros, licitacoes, ufsPrioritarias]);

  // Contagem por estado prioritário
  const countsPorUF = useMemo(() => {
    if (!licitacoes) return {};
    return ufsPrioritarias.reduce((acc, uf) => {
      acc[uf] = licitacoes.filter(l => l.uf === uf).length;
      return acc;
    }, {} as Record<string, number>);
  }, [licitacoes, ufsPrioritarias]);

  const counts = useMemo(() => ({
    todas: licitacoesFiltradas?.length || 0,
    novas: licitacoes?.filter(l => l.status === 'Nova' && ufsPrioritarias.includes(l.uf)).length || 0,
    analise: licitacoes?.filter(l => l.status === 'Em Análise' && ufsPrioritarias.includes(l.uf)).length || 0,
    aguardando: licitacoes?.filter(l => l.status === 'Aguardando Autorização' && ufsPrioritarias.includes(l.uf)).length || 0,
    disputa: licitacoes?.filter(l => (l.status === 'Em Disputa' || l.status === 'Autorizada') && ufsPrioritarias.includes(l.uf)).length || 0,
  }), [licitacoes, licitacoesFiltradas, ufsPrioritarias]);

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
        {/* Banner de estados prioritários */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-medium text-primary">Estados Prioritários:</span>
            </div>
            {ufsPrioritarias.map(uf => (
              <Badge key={uf} variant="outline" className="bg-primary/20 border-primary/40 text-primary">
                {uf} ({countsPorUF[uf] || 0})
              </Badge>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Total: {Object.values(countsPorUF).reduce((a, b) => a + b, 0)} licitações
              </span>
              <Link to="/configuracoes">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Settings className="w-4 h-4" />
                  Configurar
                </Button>
              </Link>
            </div>
          </div>
          {configuracoes?.captacao_continua && (
            <div className="mt-2 flex items-center gap-2 text-sm text-success">
              <Zap className="w-4 h-4 animate-pulse" />
              <span>Captura automática 24/7 ativa</span>
              <Globe className="w-3 h-3 ml-2" />
              <span>Atualização a cada hora</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <FiltrosLicitacao onFilterChange={setFiltros} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => capturarMultiportal.mutate()}
              disabled={capturarMultiportal.isPending}
              className="bg-primary"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${capturarMultiportal.isPending ? 'animate-spin' : ''}`} />
              Capturar Portais ({ufsPrioritarias.length} UFs)
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
                <p className="text-muted-foreground">Nenhuma licitação encontrada para os estados selecionados.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => capturarMultiportal.mutate()}
                    disabled={capturarMultiportal.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${capturarMultiportal.isPending ? 'animate-spin' : ''}`} />
                    Capturar licitações
                  </Button>
                  <Link to="/configuracoes">
                    <Button variant="secondary">
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar estados
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedLicitacao && (
        <LicitacaoDetalheCompleto
          licitacao={mapToLegacyFormat(selectedLicitacao)}
          onClose={() => setSelectedLicitacao(null)}
          onAutorizar={() => setSelectedLicitacao(null)}
        />
      )}
    </MainLayout>
  );
};

export default Licitacoes;