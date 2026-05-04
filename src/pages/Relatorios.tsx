import { MainLayout } from '@/components/layout/MainLayout';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Download,
  Bot,
  DollarSign,
  FileText,
  MapPin,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RobotPerformanceDashboard } from '@/components/relatorios/RobotPerformanceDashboard';
import { GeographicPerformanceDashboard } from '@/components/relatorios/GeographicPerformanceDashboard';
import { AIvsManualDashboard } from '@/components/relatorios/AIvsManualDashboard';

export const RelatoriosContent = () => {
  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Análises e métricas de performance do sistema
          </p>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Tudo
          </Button>
        </div>

        <Tabs defaultValue="ia-comparativo">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="ia-comparativo" className="gap-1.5">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">IA vs Manual</span>
            </TabsTrigger>
            <TabsTrigger value="robo" className="gap-1.5">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Robô</span>
            </TabsTrigger>
            <TabsTrigger value="geografico" className="gap-1.5">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Geográfico</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="captacao" className="gap-1.5">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Captação</span>
            </TabsTrigger>
          </TabsList>

          {/* AI vs Manual Comparative Dashboard */}
          <TabsContent value="ia-comparativo" className="space-y-6 mt-6">
            <AIvsManualDashboard />
          </TabsContent>

          {/* Robot Performance Dashboard */}
          <TabsContent value="robo" className="space-y-6 mt-6">
            <RobotPerformanceDashboard />
          </TabsContent>

          {/* Geographic Performance Dashboard */}
          <TabsContent value="geografico" className="space-y-6 mt-6">
            <GeographicPerformanceDashboard />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-sm text-muted-foreground">Taxa de Vitória</span>
                </div>
                <p className="text-4xl font-bold gradient-text">67%</p>
                <p className="text-sm text-success mt-2">+4% vs. mês anterior</p>
              </div>

              <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Propostas Enviadas</span>
                </div>
                <p className="text-4xl font-bold">156</p>
                <p className="text-sm text-muted-foreground mt-2">Este mês</p>
              </div>

              <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">Tempo Médio de Análise</span>
                </div>
                <p className="text-4xl font-bold">2.4h</p>
                <p className="text-sm text-success mt-2">-18min vs. média</p>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="glass-card p-6 animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              <h3 className="font-semibold mb-4">Evolução Mensal</h3>
              <div className="h-64 flex items-center justify-center bg-secondary/30 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Gráfico de evolução disponível com integração de dados</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6 mt-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Resumo Financeiro</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Captado</p>
                  <p className="text-2xl font-bold gradient-text">R$ 2.4M</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Vencido</p>
                  <p className="text-2xl font-bold text-success">R$ 1.8M</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margem Média</p>
                  <p className="text-2xl font-bold">18.5%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ROI Médio</p>
                  <p className="text-2xl font-bold text-success">23%</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="captacao" className="space-y-6 mt-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Captação por Portal</h3>
              <div className="space-y-4">
                {[
                  { portal: 'PNCP', count: 45, percentage: 28 },
                  { portal: 'ComprasNet', count: 38, percentage: 24 },
                  { portal: 'BLL', count: 32, percentage: 20 },
                  { portal: 'ComprasPublicas', count: 25, percentage: 16 },
                  { portal: 'Outros', count: 16, percentage: 12 },
                ].map((item) => (
                  <div key={item.portal} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.portal}</span>
                      <span className="text-muted-foreground">{item.count} licitações ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
};

const Relatorios = () => (
  <MainLayout title="Relatórios">
    <RelatoriosContent />
  </MainLayout>
);

export default Relatorios;
