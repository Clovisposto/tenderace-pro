import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
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
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data for charts
const monthlyData = [
  { mes: 'Ago', propostas: 45, vitorias: 28, valorEconomizado: 12500, taxaSucesso: 62 },
  { mes: 'Set', propostas: 52, vitorias: 35, valorEconomizado: 18700, taxaSucesso: 67 },
  { mes: 'Out', propostas: 48, vitorias: 31, valorEconomizado: 15200, taxaSucesso: 65 },
  { mes: 'Nov', propostas: 61, vitorias: 42, valorEconomizado: 24300, taxaSucesso: 69 },
  { mes: 'Dez', propostas: 55, vitorias: 38, valorEconomizado: 21800, taxaSucesso: 69 },
  { mes: 'Jan', propostas: 67, vitorias: 48, valorEconomizado: 29500, taxaSucesso: 72 },
];

const lancesData = [
  { hora: '08:00', lances: 12, vitorias: 3 },
  { hora: '09:00', lances: 28, vitorias: 8 },
  { hora: '10:00', lances: 45, vitorias: 15 },
  { hora: '11:00', lances: 38, vitorias: 12 },
  { hora: '12:00', lances: 15, vitorias: 4 },
  { hora: '13:00', lances: 22, vitorias: 6 },
  { hora: '14:00', lances: 52, vitorias: 18 },
  { hora: '15:00', lances: 48, vitorias: 16 },
  { hora: '16:00', lances: 35, vitorias: 10 },
  { hora: '17:00', lances: 25, vitorias: 7 },
];

const portalData = [
  { name: 'PNCP', value: 38, color: 'hsl(var(--primary))' },
  { name: 'ComprasNet', value: 28, color: 'hsl(var(--success))' },
  { name: 'BLL', value: 18, color: 'hsl(var(--warning))' },
  { name: 'Compras Públicas', value: 12, color: 'hsl(var(--accent))' },
  { name: 'Outros', value: 4, color: 'hsl(var(--muted-foreground))' },
];

const segmentoData = [
  { name: 'Medicamentos', value: 65, color: 'hsl(var(--success))' },
  { name: 'Empreendimentos', value: 35, color: 'hsl(var(--primary))' },
];

const comparativoData = [
  { mes: 'Ago', manual: 12, robo: 28, economiaManual: 4500, economiaRobo: 12500 },
  { mes: 'Set', manual: 15, robo: 35, economiaManual: 5200, economiaRobo: 18700 },
  { mes: 'Out', manual: 10, robo: 31, economiaManual: 3800, economiaRobo: 15200 },
  { mes: 'Nov', manual: 18, robo: 42, economiaManual: 6100, economiaRobo: 24300 },
  { mes: 'Dez', manual: 14, robo: 38, economiaManual: 4800, economiaRobo: 21800 },
  { mes: 'Jan', manual: 16, robo: 48, economiaManual: 5500, economiaRobo: 29500 },
];

export function RobotPerformanceDashboard() {
  const [periodo, setPeriodo] = useState('6m');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalVitorias = monthlyData.reduce((acc, cur) => acc + cur.vitorias, 0);
  const totalPropostas = monthlyData.reduce((acc, cur) => acc + cur.propostas, 0);
  const totalEconomizado = monthlyData.reduce((acc, cur) => acc + cur.valorEconomizado, 0);
  const taxaMediaSucesso = Math.round(monthlyData.reduce((acc, cur) => acc + cur.taxaSucesso, 0) / monthlyData.length);

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

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Performance do Robô</h2>
            <p className="text-sm text-muted-foreground">
              Análise de desempenho do sistema automatizado
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
          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
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
            <p className="text-3xl font-bold text-success">{taxaMediaSucesso}%</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+5% vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Vitórias</span>
            </div>
            <p className="text-3xl font-bold text-primary">{totalVitorias}</p>
            <p className="text-xs text-muted-foreground mt-1">
              de {totalPropostas} propostas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Valor Economizado</span>
            </div>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalEconomizado)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+12% economia</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Lances Automáticos</span>
            </div>
            <p className="text-3xl font-bold text-accent">2.847</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo médio: 0.8s
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
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} domain={[50, 80]} />
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
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={lancesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hora" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="lances" name="Lances Enviados" fill="hsl(var(--primary))" opacity={0.7} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="vitorias" name="Vitórias" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))' }} />
              </ComposedChart>
            </ResponsiveContainer>
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
                  data={portalData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {portalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Participação']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {portalData.map((item, index) => (
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
                  data={segmentoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {segmentoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Participação']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {segmentoData.map((item, index) => (
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
              <span className="text-2xl font-bold text-success">{totalVitorias}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                <span className="font-medium">Perdidas</span>
              </div>
              <span className="text-2xl font-bold text-destructive">{totalPropostas - totalVitorias}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <span className="font-medium">Em Disputa</span>
              </div>
              <span className="text-2xl font-bold text-warning">12</span>
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
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={comparativoData}>
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
              <p className="text-xl font-bold text-primary">{comparativoData.reduce((acc, cur) => acc + cur.robo, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vitórias Manual</p>
              <p className="text-xl font-bold text-muted-foreground">{comparativoData.reduce((acc, cur) => acc + cur.manual, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Eficiência Robô</p>
              <p className="text-xl font-bold text-success">+183%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Economia Total Robô</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(comparativoData.reduce((acc, cur) => acc + cur.economiaRobo, 0))}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
