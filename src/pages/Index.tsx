import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalhe } from '@/components/licitacao/LicitacaoDetalhe';
import { ParticipacoesDashboardTab } from '@/components/dashboard/ParticipacoesDashboardTab';
import { useLicitacoes, useMetricas, useLicitacoesRealtime, useCapturarPNCP, type Licitacao } from '@/hooks/useLicitacoes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  ArrowRight,
  RefreshCw,
  FileText,
  Trophy,
  PieChart,
  Bot,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: licitacoes, isLoading } = useLicitacoes();
  const { data: metricas } = useMetricas();
  const { setupRealtime } = useLicitacoesRealtime();
  const capturarPNCP = useCapturarPNCP();

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  const urgentes = licitacoes?.filter(l => 
    l.status === 'Aguardando Autorização' || l.status === 'Nova'
  ).slice(0, 4) || [];

  const emDisputa = licitacoes?.filter(l => l.status === 'Em Disputa') || [];

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

  const metricasDisplay = [
    { label: 'Licitações Ativas', value: metricas?.total || 0, variacao: 12, icon: 'FileText' },
    { label: 'Aguardando Autorização', value: metricas?.aguardando || 0, variacao: -3, icon: 'Clock' },
    { label: 'Em Disputa', value: metricas?.emDisputa || 0, variacao: 5, icon: 'Zap' },
    { label: 'Taxa de Vitória', value: `${metricas?.taxaVitoria || 0}%`, variacao: 4, icon: 'Trophy' },
    { label: 'Valor Total Captado', value: `R$ ${((metricas?.valorTotal || 0) / 1000).toFixed(0)}K`, variacao: 18, icon: 'TrendingUp' },
    { label: 'ROI Médio', value: '23%', variacao: 2, icon: 'PieChart' },
  ];

  return (
    <MainLayout title="Dashboard">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="participacoes" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Participações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {metricasDisplay.map((metrica, index) => (
              <MetricCard
                key={metrica.label}
                {...metrica}
                delay={index * 100}
              />
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Urgent Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <AlertCircle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ação Necessária</h2>
                    <p className="text-sm text-muted-foreground">Licitações aguardando sua autorização</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => capturarPNCP.mutate()}
                    disabled={capturarPNCP.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${capturarPNCP.isPending ? 'animate-spin' : ''}`} />
                    Capturar
                  </Button>
                  <Link to="/licitacoes">
                    <Button variant="ghost" className="gap-2">
                      Ver todas <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : urgentes.length > 0 ? (
                <div className="space-y-4">
                  {urgentes.map((licitacao, index) => (
                    <LicitacaoCard
                      key={licitacao.id}
                      licitacao={mapToLegacyFormat(licitacao)}
                      onClick={() => setSelectedLicitacao(licitacao)}
                      delay={300 + index * 100}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <p className="text-muted-foreground mb-4">Nenhuma licitação urgente no momento</p>
                  <Button onClick={() => capturarPNCP.mutate()} disabled={capturarPNCP.isPending}>
                    Capturar novas licitações
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Stats & Activity */}
            <div className="space-y-6">
              {/* Live Disputes */}
              <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Zap className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Disputas ao Vivo</h3>
                    <p className="text-xs text-muted-foreground">{emDisputa.length} em andamento</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {emDisputa.length > 0 ? (
                    emDisputa.slice(0, 3).map((licitacao) => (
                      <div 
                        key={licitacao.id}
                        className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedLicitacao(licitacao)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{licitacao.objeto_resumido || licitacao.objeto.substring(0, 40)}</span>
                          <span className="text-xs text-accent animate-pulse">● AO VIVO</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{licitacao.orgao}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma disputa ativa no momento
                    </p>
                  )}
                </div>
              </div>

              {/* Performance */}
              <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Performance do Mês</h3>
                    <p className="text-xs text-muted-foreground">Janeiro 2026</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Captadas</span>
                    <span className="font-bold">{metricas?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Vencidas</span>
                    <span className="font-bold text-success">{metricas?.vencidas || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Valor Total</span>
                    <span className="font-bold gradient-text">R$ {((metricas?.valorTotal || 0) / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Taxa de Sucesso</span>
                      <span className="font-bold text-success text-lg">{metricas?.taxaVitoria || 0}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" 
                        style={{ width: `${metricas?.taxaVitoria || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Status do Sistema</h3>
                    <p className="text-xs text-muted-foreground">Captação 24/7</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { status: 'online', label: 'PNCP API', desc: 'Conectado' },
                    { status: 'online', label: 'Análise IA', desc: 'Ativo' },
                    { status: 'ready', label: 'Notificações', desc: 'Configurar' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <span className={`w-2 h-2 rounded-full ${item.status === 'online' ? 'bg-success' : 'bg-warning'}`} />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="participacoes" className="mt-6">
          <ParticipacoesDashboardTab />
        </TabsContent>
      </Tabs>

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

export default Index;
