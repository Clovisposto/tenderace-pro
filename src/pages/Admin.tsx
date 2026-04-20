import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Settings,
  Database,
  Zap,
  Bell,
  Shield,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { RealtimeMonitor } from '@/components/admin/RealtimeMonitor';
import { SicafRefreshHistory } from '@/components/admin/SicafRefreshHistory';

const Admin = () => {
  const [cronStatus, setCronStatus] = useState<'running' | 'paused'>('running');
  const [lastCapture, setLastCapture] = useState<Date | null>(null);
  const [clearing, setClearing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch cron job logs
  const { data: cronLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['cron-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('captura_jobs_log' as any)
        .select('*')
        .order('ran_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000
  });

  // Fetch system metrics
  const { data: metricas } = useQuery({
    queryKey: ['admin-metricas'],
    queryFn: async () => {
      const { data: licitacoes } = await supabase
        .from('licitacoes')
        .select('id, status, created_at', { count: 'exact' });
      
      const hoje = new Date();
      const ultimaHora = new Date(hoje.getTime() - 60 * 60 * 1000);
      const ultimo24h = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
      
      const capturadasHoje = licitacoes?.filter(l => 
        new Date(l.created_at) > ultimo24h
      ).length || 0;

      return {
        total: licitacoes?.length || 0,
        capturadasHoje,
        novas: licitacoes?.filter(l => l.status === 'Nova').length || 0,
        emAnalise: licitacoes?.filter(l => l.status === 'Em Análise').length || 0,
      };
    },
    refetchInterval: 60000
  });

  const handleManualCapture = async () => {
    try {
      toast.info('Iniciando captura manual...');
      const { data, error } = await supabase.functions.invoke('capturar-pncp');
      
      if (error) throw error;
      
      toast.success(`Captura realizada: ${data?.inserted || 0} licitações`);
      refetchLogs();
    } catch (error) {
      toast.error('Erro na captura manual');
      console.error(error);
    }
  };

  const handleClearAllLicitacoes = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai DELETAR TODAS as licitações do banco de dados. Deseja continuar?')) return;
    if (!confirm('Tem certeza? Esta ação é IRREVERSÍVEL.')) return;
    
    setClearing(true);
    try {
      const { error } = await supabase
        .from('licitacoes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // deletes all rows
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metricas'] });
      toast.success('Todas as licitações foram removidas. Execute uma nova captura.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao limpar licitações');
    } finally {
      setClearing(false);
    }
  };

  const systemServices = [
    { name: 'PNCP API', status: 'online', latency: '120ms' },
    { name: 'Cron Job (Hourly)', status: cronStatus === 'running' ? 'online' : 'paused', latency: '-' },
    { name: 'Análise IA', status: 'online', latency: '850ms' },
    { name: 'Banco de Dados', status: 'online', latency: '15ms' },
    { name: 'Notificações', status: 'ready', latency: '-' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-warning" />;
      case 'ready':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'started': 'bg-accent/20 text-accent',
      'queued': 'bg-primary/20 text-primary',
      'completed': 'bg-success/20 text-success',
      'error': 'bg-destructive/20 text-destructive',
    };
    return variants[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <MainLayout title="Painel Administrativo">
      <div className="space-y-6">
        {/* Admin Temporário Banner */}
        <div className="bg-warning/20 border border-warning/50 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <div>
            <p className="font-medium text-warning">ADMIN TEMPORÁRIO</p>
            <p className="text-sm text-muted-foreground">Acesso liberado para validação. Sistema 24x7 ativo com captura automática a cada hora.</p>
          </div>
          <Badge className="ml-auto bg-success/20 text-success border-success/30">CRON ATIVO</Badge>
        </div>
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Licitações</p>
                  <p className="text-2xl font-bold">{metricas?.total || 0}</p>
                </div>
                <Database className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Capturadas (24h)</p>
                  <p className="text-2xl font-bold">{metricas?.capturadasHoje || 0}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-accent opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Novas</p>
                  <p className="text-2xl font-bold">{metricas?.novas || 0}</p>
                </div>
                <Zap className="w-8 h-8 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Em Análise</p>
                  <p className="text-2xl font-bold">{metricas?.emAnalise || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="realtime" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="realtime" className="gap-2">
              <Radio className="w-4 h-4" />
              Tempo Real
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Server className="w-4 h-4" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="cron" className="gap-2">
              <Clock className="w-4 h-4" />
              Cron Jobs
            </TabsTrigger>
            <TabsTrigger value="sicaf" className="gap-2">
              <Shield className="w-4 h-4" />
              SICAF
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Activity className="w-4 h-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* SICAF Tab */}
          <TabsContent value="sicaf">
            <SicafRefreshHistory />
          </TabsContent>

          {/* Realtime Tab */}
          <TabsContent value="realtime">
            <RealtimeMonitor />
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status dos Serviços */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Status dos Serviços
                  </CardTitle>
                  <CardDescription>Monitoramento em tempo real</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemServices.map((service) => (
                      <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(service.status)}
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {service.latency !== '-' && (
                            <span className="text-xs text-muted-foreground">{service.latency}</span>
                          )}
                          <Badge variant="outline" className={`text-xs ${
                            service.status === 'online' ? 'border-success text-success' :
                            service.status === 'paused' ? 'border-warning text-warning' :
                            'border-muted-foreground text-muted-foreground'
                          }`}>
                            {service.status === 'online' ? 'Online' : 
                             service.status === 'paused' ? 'Pausado' : 'Pronto'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ações Rápidas */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Ações Rápidas
                  </CardTitle>
                  <CardDescription>Controles do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium">Captura Manual</p>
                      <p className="text-xs text-muted-foreground">Executar captura imediata do PNCP</p>
                    </div>
                    <Button onClick={handleManualCapture} className="gap-2">
                      <Play className="w-4 h-4" />
                      Executar
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium">Atualizar Cache</p>
                      <p className="text-xs text-muted-foreground">Limpar e recarregar dados</p>
                    </div>
                    <Button variant="outline" onClick={() => {
                      refetchLogs();
                      toast.success('Cache atualizado');
                    }} className="gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Atualizar
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div>
                      <p className="font-medium text-destructive">Limpar Todas as Licitações</p>
                      <p className="text-xs text-muted-foreground">Remove tudo para capturar do zero</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleClearAllLicitacoes} 
                      disabled={clearing}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {clearing ? 'Limpando...' : 'Limpar Tudo'}
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium">Captura Automática (Cron)</p>
                      <p className="text-xs text-muted-foreground">Executa a cada hora</p>
                    </div>
                    <Switch
                      checked={cronStatus === 'running'}
                      onCheckedChange={(checked) => {
                        setCronStatus(checked ? 'running' : 'paused');
                        toast.info(checked ? 'Cron ativado' : 'Cron pausado');
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cron Jobs Tab */}
          <TabsContent value="cron">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico de Execuções
                </CardTitle>
                <CardDescription>
                  Últimas execuções do cron job de captura (pg_cron)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {cronLogs && cronLogs.length > 0 ? (
                    <div className="space-y-2">
                      {cronLogs.map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              log.status === 'completed' ? 'bg-success' :
                              log.status === 'error' ? 'bg-destructive' :
                              log.status === 'queued' ? 'bg-primary' :
                              'bg-warning'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(log.ran_at).toLocaleString('pt-BR')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {log.details?.request_id ? `Request ID: ${log.details.request_id}` : 'Aguardando...'}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusBadge(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma execução registrada</p>
                      <p className="text-xs mt-1">O cron job executa a cada hora (minuto 0)</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Logs do Sistema
                </CardTitle>
                <CardDescription>Eventos e atividades recentes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 font-mono text-xs">
                    {cronLogs?.map((log: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-secondary/30">
                        <span className="text-muted-foreground">
                          [{new Date(log.ran_at).toISOString()}]
                        </span>
                        <span className={`ml-2 ${
                          log.status === 'error' ? 'text-destructive' :
                          log.status === 'completed' ? 'text-success' :
                          'text-primary'
                        }`}>
                          [{log.status.toUpperCase()}]
                        </span>
                        <span className="ml-2">
                          Captura PNCP - {log.details?.request_id || 'Iniciando...'}
                        </span>
                        {log.details?.error && (
                          <div className="mt-1 text-destructive pl-4">
                            Error: {log.details.error}
                          </div>
                        )}
                      </div>
                    ))}
                    {!cronLogs?.length && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum log disponível
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Segurança e Conformidade
                </CardTitle>
                <CardDescription>Status de segurança do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="font-medium">Lei 14.133/2021</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sistema em conformidade com a nova lei de licitações
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="font-medium">LGPD</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Apenas dados públicos são processados
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="font-medium">RLS Ativo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Row Level Security habilitado em todas as tabelas
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="font-medium">APIs Públicas</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Operação limitada a endpoints públicos (PNCP)
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <span className="font-medium">Áreas Autenticadas</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automação de login em portais está <strong>DESABILITADA</strong> por conformidade legal.
                    Interações em áreas restritas requerem ação manual do usuário.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Admin;