import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  DollarSign,
  Zap,
  Activity,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useRobotMetrics, useRobotActivity } from '@/hooks/useRobotMetrics';

export function RobotPerformanceDashboard() {
  const [periodo, setPeriodo] = useState('6m');
  const { data: metrics, isLoading, refetch, isRefetching } = useRobotMetrics(periodo);
  const { data: activity } = useRobotActivity();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Economia') 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  const {
    monthlyData = [],
    hourlyData = [],
    portalDistribution = [],
    segmentoDistribution = [],
    comparativeData = [],
    statusSummary = { vencidas: 0, perdidas: 0, emDisputa: 0, aguardando: 0, novas: 0, emAnalise: 0, autorizadas: 0, canceladas: 0 },
    kpis = { totalVitorias: 0, totalPropostas: 0, totalEconomizado: 0, taxaMediaSucesso: 0, lancesAutomaticos: 0, tempoMedioResposta: 0, variacaoSucesso: 0, variacaoEconomia: 0 },
  } = metrics || {};

  // Calculate efficiency comparison
  const totalRoboVitorias = comparativeData.reduce((acc, cur) => acc + cur.robo, 0);
  const totalManualVitorias = comparativeData.reduce((acc, cur) => acc + cur.manual, 0);
  const eficienciaRobo = totalManualVitorias > 0 
    ? Math.round(((totalRoboVitorias - totalManualVitorias) / totalManualVitorias) * 100) 
    : totalRoboVitorias > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Performance do Robô 24/7</h2>
            <p className="text-sm text-muted-foreground">
              Dados em tempo real do sistema automatizado
              {activity?.lastActivity && (
                <span className="ml-2 text-success">
                  • Última atividade: {new Date(activity.lastActivity).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Último mês</SelectItem>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="1a">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Taxa de Sucesso</span>
            </div>
            <p className="text-3xl font-bold text-success">
              {kpis.taxaMediaSucesso}%
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {kpis.variacaoSucesso >= 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-success" />
                  <span className="text-success">+{kpis.variacaoSucesso}% vs período anterior</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 text-destructive" />
                  <span className="text-destructive">{kpis.variacaoSucesso}% vs período anterior</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Vitórias</span>
            </div>
            <p className="text-3xl font-bold text-primary">{kpis.totalVitorias}</p>
            <p className="text-xs text-muted-foreground mt-1">
              de {kpis.totalPropostas} propostas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Valor Economizado</span>
            </div>
            <p className="text-2xl font-bold text-warning">{formatCurrency(kpis.totalEconomizado)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {kpis.variacaoEconomia >= 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-success" />
                  <span className="text-success">+{kpis.variacaoEconomia}% economia</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 text-destructive" />
                  <span className="text-destructive">{kpis.variacaoEconomia}% economia</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Lances Hoje</span>
            </div>
            <p className="text-3xl font-bold text-accent">{activity?.todayLances || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo médio: {kpis.tempoMedioResposta}s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate Evolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolução da Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorTaxa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="taxaSucesso"
                    name="Taxa de Sucesso (%)"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTaxa)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Propostas vs Vitórias (Mensal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="propostas" name="Propostas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vitorias" name="Vitórias" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Savings and Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value Saved Evolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-warning" />
              Valor Economizado por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorEconomia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Economia']}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="valorEconomizado"
                    name="Valor Economizado"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEconomia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity by Hour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Atividade por Horário (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyData.some(h => h.lances > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hora" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="lances" name="Lances Enviados" fill="hsl(var(--primary))" opacity={0.7} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="vitorias" name="Vitórias" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade registrada hoje</p>
                  <p className="text-xs mt-1">O robô está aguardando licitações ativas</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portal Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" />
              Vitórias por Portal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={portalDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {portalDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Participação']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {portalDistribution.map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs" style={{ borderColor: item.color }}>
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                  {item.name}: {item.value}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Segment Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Vitórias por Segmento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={segmentoDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {segmentoDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Participação']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {segmentoDistribution.map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs" style={{ borderColor: item.color }}>
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                  {item.name}: {item.value}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Resumo de Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="font-medium">Vencidas</span>
              </div>
              <span className="text-2xl font-bold text-success">{statusSummary.vencidas}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                <span className="font-medium">Perdidas</span>
              </div>
              <span className="text-2xl font-bold text-destructive">{statusSummary.perdidas}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <span className="font-medium">Em Disputa</span>
              </div>
              <span className="text-2xl font-bold text-warning">{statusSummary.emDisputa}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Robot vs Manual Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            Comparativo: Robô vs Manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comparativeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={comparativeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="manual" name="Vitórias (Manual)" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="robo" name="Vitórias (Robô)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="economiaRobo" name="Economia (Robô)" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))' }} />
                </ComposedChart>
              </ResponsiveContainer>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Vitórias Robô</p>
                  <p className="text-xl font-bold text-primary">{totalRoboVitorias}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vitórias Manual (Est.)</p>
                  <p className="text-xl font-bold text-muted-foreground">{totalManualVitorias}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Eficiência Robô</p>
                  <p className="text-xl font-bold text-success">+{eficienciaRobo}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Economia Total Robô</p>
                  <p className="text-xl font-bold text-warning">
                    {formatCurrency(comparativeData.reduce((acc, cur) => acc + cur.economiaRobo, 0))}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível para comparativo
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
