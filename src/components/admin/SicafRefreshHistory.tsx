import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, Play, ChevronDown, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SicafLog {
  id: number;
  ran_at: string;
  processadas: number;
  sucesso: number;
  erros: number;
  status: string;
  resultados: Array<{ empresa: string; cnpj: string; status: string; error?: string }>;
}

export const SicafRefreshHistory = () => {
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: logs, refetch, isLoading } = useQuery({
    queryKey: ['sicaf-refresh-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sicaf_refresh_log' as any)
        .select('*')
        .order('ran_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as unknown) as SicafLog[];
    },
    refetchInterval: 30000,
  });

  const handleRunNow = async () => {
    setRunning(true);
    try {
      toast.info('Executando atualização SICAF...');
      const { error } = await supabase.functions.invoke('sicaf-daily-refresh');
      if (error) throw error;
      toast.success('Atualização SICAF concluída');
      refetch();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao executar SICAF');
    } finally {
      setRunning(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'concluido') return <Badge className="bg-success/20 text-success border-success/30">Concluído</Badge>;
    if (status === 'parcial') return <Badge className="bg-warning/20 text-warning border-warning/30">Parcial</Badge>;
    return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Erro</Badge>;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Histórico Cron SICAF
            </CardTitle>
            <CardDescription>
              Atualização diária automática (06:00 UTC) do status SICAF de todas as empresas cadastradas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button size="sm" onClick={handleRunNow} disabled={running} className="gap-2">
              <Play className="w-4 h-4" />
              {running ? 'Executando...' : 'Executar agora'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <Collapsible
                  key={log.id}
                  open={expanded === log.id}
                  onOpenChange={(o) => setExpanded(o ? log.id : null)}
                >
                  <div className="rounded-lg bg-secondary/30 border border-border/40">
                    <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-secondary/50 transition-colors rounded-lg">
                      <div className="flex items-center gap-3">
                        {log.status === 'concluido' ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : log.status === 'parcial' ? (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium">
                            {new Date(log.ran_at).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.processadas} empresas • {log.sucesso} sucesso • {log.erros} erros
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(log.status)}
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded === log.id ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-1 space-y-1">
                        {log.resultados && log.resultados.length > 0 ? (
                          log.resultados.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-background/50">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{r.empresa}</p>
                                <p className="text-muted-foreground">{r.cnpj}</p>
                              </div>
                              <Badge variant="outline" className={`text-xs ml-2 ${
                                r.error || r.status === 'Erro'
                                  ? 'border-destructive text-destructive'
                                  : r.status === 'Inapta'
                                  ? 'border-warning text-warning'
                                  : 'border-success text-success'
                              }`}>
                                {r.error ? 'Erro' : r.status}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground p-2">Sem detalhes</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma execução registrada</p>
              <p className="text-xs mt-1">Clique em "Executar agora" para rodar a primeira atualização</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
