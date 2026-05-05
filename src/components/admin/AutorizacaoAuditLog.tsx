import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogRow {
  id: string;
  user_id: string | null;
  empresa_id: string | null;
  licitacao_id: string | null;
  proposta_id: string | null;
  acao: string;
  resultado: 'liberada' | 'bloqueada';
  motivo: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export function AutorizacaoAuditLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('autorizacao_participacao_log' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Auditoria — AUTORIZAR_PARTICIPAÇÃO
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px] pr-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma autorização registrada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="border rounded-md p-3 text-xs space-y-1 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={r.resultado === 'liberada' ? 'default' : 'destructive'}
                      className="gap-1"
                    >
                      {r.resultado === 'liberada' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <ShieldX className="w-3 h-3" />
                      )}
                      {r.resultado.toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground font-mono">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                    <div><span className="text-muted-foreground">Ação:</span> {r.acao}</div>
                    <div><span className="text-muted-foreground">IP:</span> {r.ip_address || '—'}</div>
                    <div className="truncate"><span className="text-muted-foreground">User:</span> {r.user_id || '—'}</div>
                    <div className="truncate"><span className="text-muted-foreground">Licitação:</span> {r.licitacao_id?.slice(0, 8) || '—'}</div>
                    <div className="truncate"><span className="text-muted-foreground">Empresa:</span> {r.empresa_id?.slice(0, 8) || '—'}</div>
                    <div className="truncate"><span className="text-muted-foreground">Proposta:</span> {r.proposta_id?.slice(0, 8) || '—'}</div>
                  </div>
                  {r.motivo && (
                    <div className="text-muted-foreground italic pt-1 border-t mt-1">{r.motivo}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
