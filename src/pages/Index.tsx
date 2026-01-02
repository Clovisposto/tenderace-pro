import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalhe } from '@/components/licitacao/LicitacaoDetalhe';
import { mockLicitacoes, mockMetricas } from '@/data/mockData';
import { Licitacao } from '@/types/licitacao';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);

  const urgentes = useMemo(() => {
    return mockLicitacoes
      .filter(l => l.status === 'Aguardando Autorização' || l.status === 'Nova')
      .slice(0, 4);
  }, []);

  const emDisputa = useMemo(() => {
    return mockLicitacoes.filter(l => l.status === 'Em Disputa');
  }, []);

  return (
    <MainLayout title="Dashboard">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {mockMetricas.map((metrica, index) => (
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
            <Link to="/licitacoes">
              <Button variant="ghost" className="gap-2">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {urgentes.map((licitacao, index) => (
              <LicitacaoCard
                key={licitacao.id}
                licitacao={licitacao}
                onClick={() => setSelectedLicitacao(licitacao)}
                delay={300 + index * 100}
              />
            ))}
          </div>
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
                emDisputa.map((licitacao) => (
                  <div 
                    key={licitacao.id}
                    className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                    onClick={() => setSelectedLicitacao(licitacao)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{licitacao.objetoResumido}</span>
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
                <span className="text-sm text-muted-foreground">Propostas Enviadas</span>
                <span className="font-bold">47</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vencidas</span>
                <span className="font-bold text-success">31</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor Total</span>
                <span className="font-bold gradient-text">R$ 847.500</span>
              </div>
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Sucesso</span>
                  <span className="font-bold text-success text-lg">66%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-[66%] bg-gradient-to-r from-primary to-accent rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Atividade Recente</h3>
                <p className="text-xs text-muted-foreground">Última hora</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { time: '14:32', event: 'Nova licitação captada', portal: 'PNCP' },
                { time: '14:28', event: 'Proposta enviada', portal: 'ComprasNet' },
                { time: '14:15', event: 'Lance automático', portal: 'BLL' },
                { time: '14:02', event: 'Análise concluída', portal: 'ComprasPublicas' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{activity.time}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="flex-1">{activity.event}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">{activity.portal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
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

export default Index;
