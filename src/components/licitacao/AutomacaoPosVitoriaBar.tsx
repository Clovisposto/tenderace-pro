import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, CheckCircle2, Cloud, FileText, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Vencida {
  id: string;
  licitacao_id: string;
  empresa_id: string;
  licitacao: { numero: string };
  empresa: { nome: string };
}

export function AutomacaoPosVitoriaBar({ vencidas }: { vencidas: Vencida[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [resumo, setResumo] = useState<any>(null);

  const executar = async () => {
    if (!vencidas.length) {
      toast({ title: 'Nenhuma vitória', description: 'Não há licitações vencidas para processar.' });
      return;
    }
    setRunning(true);
    setLog([`🚀 Iniciando automação para ${vencidas.length} licitação(ões) vencida(s)...`]);
    setResumo(null);

    let totalDocs = 0, totalCatalogo = 0, totalItens = 0;
    for (const v of vencidas) {
      setLog(prev => [...prev, `\n▶ ${v.licitacao.numero} — ${v.empresa.nome}`]);
      try {
        const { data, error } = await supabase.functions.invoke('automacao-pos-vitoria', {
          body: { proposta_id: v.id, licitacao_id: v.licitacao_id, empresa_id: v.empresa_id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (Array.isArray(data?.log)) setLog(prev => [...prev, ...data.log.map((l: string) => `   ${l}`)]);
        totalDocs += data?.resultado?.total_docs || 0;
        totalCatalogo += data?.resultado?.catalogo || 0;
        totalItens += data?.resultado?.proposta?.total_itens || 0;
      } catch (e: any) {
        setLog(prev => [...prev, `   ❌ Erro: ${e.message}`]);
      }
    }

    setResumo({ totalDocs, totalCatalogo, totalItens, licitacoes: vencidas.length });
    setRunning(false);
    qc.invalidateQueries({ queryKey: ['minhas-participacoes'] });
    qc.invalidateQueries({ queryKey: ['hab-docs'] });
    toast({
      title: '✅ Automação concluída',
      description: `${totalDocs} doc(s) do Drive, ${totalItens} item(ns) na proposta, ${totalCatalogo} no catálogo.`,
    });
  };

  if (!vencidas.length) return null;

  return (
    <Card className="mb-4 border-2 border-primary/40 bg-gradient-to-r from-primary/5 to-success/5">
      <div className="p-4 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <h4 className="font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Automação Pós-Vitória (IA + Google Drive)
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Para cada licitação vencida: <strong>busca documentos no Drive</strong>,
            monta a <strong>proposta com itens do edital + cotação</strong> (preço de venda, quantidade, modelo)
            e cria o <strong>catálogo do produto</strong>.
          </p>
        </div>
        <Button onClick={executar} disabled={running} size="lg" className="gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {running ? 'Processando...' : `Executar para ${vencidas.length} vitória(s)`}
        </Button>
      </div>

      {(log.length > 0 || resumo) && (
        <div className="px-4 pb-4 space-y-3">
          {resumo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat icon={CheckCircle2} label="Licitações" value={resumo.licitacoes} />
              <Stat icon={Cloud} label="Docs do Drive" value={resumo.totalDocs} />
              <Stat icon={FileText} label="Itens proposta" value={resumo.totalItens} />
              <Stat icon={Package} label="Catálogo" value={resumo.totalCatalogo} />
            </div>
          )}
          <ScrollArea className="h-40 rounded-md border bg-background/60 p-3">
            <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed">{log.join('\n')}</pre>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/80 border">
      <Icon className="w-4 h-4 text-primary" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        <p className="font-bold text-sm">{value}</p>
      </div>
    </div>
  );
}
