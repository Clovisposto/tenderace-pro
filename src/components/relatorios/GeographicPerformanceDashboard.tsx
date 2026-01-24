import { useState } from 'react';
import { useGeographicMetrics } from '@/hooks/useGeographicMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Trophy, 
  TrendingUp, 
  Building2, 
  Target,
  Medal,
  BarChart3,
  Globe
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

const UF_COLORS: Record<string, string> = {
  'PA': '#22c55e',
  'MA': '#3b82f6',
  'GO': '#f59e0b',
  'TO': '#8b5cf6',
  'SP': '#ef4444',
  'RJ': '#06b6d4',
  'MG': '#ec4899',
  'BA': '#14b8a6',
  'default': '#6b7280',
};

const getUFColor = (uf: string) => UF_COLORS[uf] || UF_COLORS['default'];

export function GeographicPerformanceDashboard() {
  const [periodo, setPeriodo] = useState('6m');
  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  const { data: metrics, isLoading } = useGeographicMetrics(periodo);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter municipalities by selected UF
  const filteredMunicipios = selectedUF
    ? metrics?.municipioMetrics.filter(m => m.uf === selectedUF) || []
    : metrics?.topMunicipios || [];

  const topMunicipiosForDisplay = [...filteredMunicipios]
    .sort((a, b) => b.vitorias - a.vitorias || b.taxaSucesso - a.taxaSucesso)
    .slice(0, 8);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Performance Geográfica</h2>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">1 mês</SelectItem>
            <SelectItem value="3m">3 meses</SelectItem>
            <SelectItem value="6m">6 meses</SelectItem>
            <SelectItem value="1a">1 ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Estados Ativos</span>
            </div>
            <p className="text-3xl font-bold">{metrics?.summary.totalUFs || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Com licitações captadas
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Building2 className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">Municípios</span>
            </div>
            <p className="text-3xl font-bold">{metrics?.summary.totalMunicipios || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Com participação ativa
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm text-muted-foreground">UF Top</span>
            </div>
            <p className="text-3xl font-bold">{metrics?.summary.ufMaisVitorias || '-'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mais vitórias
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Taxa Nacional</span>
            </div>
            <p className="text-3xl font-bold">{metrics?.summary.taxaMediaNacional || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sucesso médio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UF Performance Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Vitórias por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics?.topUFs || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="uf" 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'vitorias') return [value, 'Vitórias'];
                      if (name === 'perdidas') return [value, 'Perdidas'];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="vitorias" 
                    fill="hsl(var(--success))" 
                    radius={[0, 4, 4, 0]}
                    name="Vitórias"
                  />
                  <Bar 
                    dataKey="perdidas" 
                    fill="hsl(var(--destructive))" 
                    radius={[0, 4, 4, 0]}
                    opacity={0.6}
                    name="Perdidas"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* UF Success Rate Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Taxa de Sucesso por UF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.topUFs.filter(u => u.vitorias > 0) || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="vitorias"
                    nameKey="uf"
                    label={({ uf, taxaSucesso }) => `${uf}: ${taxaSucesso}%`}
                    labelLine={true}
                  >
                    {(metrics?.topUFs || []).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getUFColor(entry.uf)}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} vitórias (${props.payload.taxaSucesso}% sucesso)`,
                      props.payload.uf
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top UFs Table */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Medal className="w-4 h-4 text-warning" />
              Ranking de Estados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.topUFs.slice(0, 6).map((uf, index) => (
                <div
                  key={uf.uf}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                    selectedUF === uf.uf ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
                  }`}
                  onClick={() => setSelectedUF(selectedUF === uf.uf ? null : uf.uf)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      index === 1 ? 'bg-gray-400/20 text-gray-600' :
                      index === 2 ? 'bg-orange-500/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{uf.uf}</p>
                      <p className="text-xs text-muted-foreground">
                        {uf.total} licitações
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge variant={uf.taxaSucesso >= 50 ? 'default' : 'secondary'}>
                        {uf.taxaSucesso}%
                      </Badge>
                      <span className="text-sm font-medium text-success">
                        {uf.vitorias} 🏆
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(uf.valorVencido)}
                    </p>
                  </div>
                </div>
              ))}
              
              {(!metrics?.topUFs || metrics.topUFs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhum dado geográfico disponível</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Municipios Table */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {selectedUF ? `Municípios de ${selectedUF}` : 'Top Municípios'}
              </CardTitle>
              {selectedUF && (
                <Badge 
                  variant="outline" 
                  className="cursor-pointer"
                  onClick={() => setSelectedUF(null)}
                >
                  Limpar filtro ✕
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMunicipiosForDisplay.map((m, index) => (
                <div
                  key={`${m.municipio}-${m.uf}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      index === 1 ? 'bg-gray-400/20 text-gray-600' :
                      index === 2 ? 'bg-orange-500/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{m.municipio}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.uf} • {m.total} licitações
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge variant={m.taxaSucesso >= 50 ? 'default' : 'secondary'}>
                        {m.taxaSucesso}%
                      </Badge>
                      <span className="text-sm font-medium text-success">
                        {m.vitorias} 🏆
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(m.valorVencido)}
                    </p>
                  </div>
                </div>
              ))}

              {topMunicipiosForDisplay.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>
                    {selectedUF 
                      ? `Nenhum município encontrado em ${selectedUF}`
                      : 'Nenhum dado disponível'
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate by UF - Progress Bars */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Comparativo de Taxa de Sucesso por Estado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics?.topUFs.slice(0, 9).map(uf => (
              <div key={uf.uf} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{uf.uf}</span>
                  <span className="text-muted-foreground">
                    {uf.vitorias}/{uf.vitorias + uf.perdidas} ({uf.taxaSucesso}%)
                  </span>
                </div>
                <div className="relative">
                  <Progress 
                    value={uf.taxaSucesso} 
                    className="h-2"
                  />
                  {uf.taxaSucesso >= (metrics?.summary.taxaMediaNacional || 0) && (
                    <div 
                      className="absolute top-0 h-2 w-0.5 bg-primary"
                      style={{ left: `${metrics?.summary.taxaMediaNacional || 0}%` }}
                      title={`Média nacional: ${metrics?.summary.taxaMediaNacional || 0}%`}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor: {formatCurrency(uf.valorVencido)} vencido
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Linha indica média nacional ({metrics?.summary.taxaMediaNacional || 0}%)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
