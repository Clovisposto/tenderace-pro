import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, RotateCw, Edit3, X, ExternalLink, TrendingUp, AlertCircle, Download, FileSpreadsheet, ShieldCheck, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useLicitacaoItens,
  useExtrairItens,
  useCotarItemRobo,
  useUpdateItem,
  type LicitacaoItem,
} from '@/hooks/useLicitacaoItens';

interface Props {
  licitacaoId: string;
  itensJaExtraidos: boolean;
  licitacaoNumero?: string;
  licitacaoStatus?: string;
}

const fmt = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const PlanilhaCotacao = ({ licitacaoId, itensJaExtraidos, licitacaoNumero, licitacaoStatus }: Props) => {
  const { data: itens = [], isLoading } = useLicitacaoItens(licitacaoId);
  const extrair = useExtrairItens();
  const cotar = useCotarItemRobo();
  const update = useUpdateItem();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const autoExtractedRef = useRef(false);

  // Parâmetros de impostos / logística / margem estratégica (Lei 14.133/2021)
  const [icmsPct, setIcmsPct] = useState<number>(18);     // ICMS médio
  const [pisCofinsPct, setPisCofinsPct] = useState<number>(9.25); // PIS+COFINS
  const [issPct, setIssPct] = useState<number>(0);        // ISS (serviços)
  const [logisticaPct, setLogisticaPct] = useState<number>(3); // % sobre custo
  const [margemMinPct, setMargemMinPct] = useState<number>(15);   // margem mínima aceitável
  const [margemAlvoPct, setMargemAlvoPct] = useState<number>(25); // margem desejada para lance inicial
  const tributosPct = icmsPct + pisCofinsPct + issPct;

  // Auto-extrair via IA na primeira vez que a aba é aberta
  useEffect(() => {
    if (!itensJaExtraidos && itens.length === 0 && !extrair.isPending && !autoExtractedRef.current && !isLoading) {
      autoExtractedRef.current = true;
      extrair.mutate(licitacaoId);
    }
  }, [itensJaExtraidos, itens.length, isLoading, licitacaoId, extrair]);

  const callAction = async (action: 'autorizar' | 'descartar', motivo?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/licitacao-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        action,
        licitacao_id: licitacaoId,
        motivo,
        frase: action === 'autorizar' ? 'AUTORIZAR_PARTICIPACAO' : undefined,
        metadata: { origem: 'planilha-cotacao', total_itens: itens.length },
      }),
    });
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || 'Falha');
  };

  const autorizarDisputa = useMutation({
    mutationFn: () => callAction('autorizar'),
    onSuccess: () => {
      toast.success('🤖 Autorizado para Disputa', { description: 'Auditoria registrada. O robô vai participar.' });
      qc.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (e: Error) => toast.error('Falha ao autorizar', { description: e.message }),
  });

  const descartar = useMutation({
    mutationFn: (motivo: string) => callAction('descartar', motivo),
    onSuccess: () => {
      toast.success('Licitação descartada', { description: 'Removida da cotação. Auditoria registrada.' });
      qc.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (e: Error) => toast.error('Falha ao descartar', { description: e.message }),
  });

  const handleManual = (item: LicitacaoItem) => {
    const valor = parseFloat(editing[item.id] || '0');
    if (!valor || valor <= 0) return;
    update.mutate({
      id: item.id,
      licitacao_id: licitacaoId,
      preco_manual: valor,
      modo_cotacao: 'manual',
    });
    setEditing((s) => ({ ...s, [item.id]: '' }));
  };

  const handleCancelarRobo = (item: LicitacaoItem) => {
    update.mutate({
      id: item.id,
      licitacao_id: licitacaoId,
      modo_cotacao: 'pendente',
      preco_robo: null,
      robo_fontes: [],
    } as any);
  };

  const buildExportRows = () => {
    const rows = itens.map((i) => {
      const custo = i.modo_cotacao === 'manual' ? i.preco_manual : i.modo_cotacao === 'robo' ? i.preco_robo : null;
      const subtotalRef = (i.preco_referencia || 0) * i.quantidade;
      const subtotalCusto = (custo || 0) * i.quantidade;
      const lucro = subtotalRef - subtotalCusto;
      return {
        'Item': i.numero_item,
        'Descrição': i.descricao,
        'Unid.': i.unidade,
        'Qtde': i.quantidade,
        'Preço Ref. (Edital)': i.preco_referencia ?? '',
        'Preço Robô (IA)': i.preco_robo ?? '',
        'Preço Manual': i.preco_manual ?? '',
        'Modo': i.modo_cotacao,
        'Custo Unit. Final': custo ?? '',
        'Subtotal Ref.': subtotalRef,
        'Subtotal Custo': subtotalCusto,
        'Lucro Estimado': lucro,
        'Margem %': i.margem_lucro != null ? Number(i.margem_lucro.toFixed(2)) : '',
        'Fontes Robô': (i.robo_fontes || []).map(f => `${f.loja}: ${f.preco}${f.url ? ` (${f.url})` : ''}`).join(' | '),
      };
    });

    const totalRef = itens.reduce((s, i) => s + (i.preco_referencia || 0) * i.quantidade, 0);
    const totalCusto = itens.reduce((s, i) => {
      const c = i.modo_cotacao === 'manual' ? i.preco_manual : i.modo_cotacao === 'robo' ? i.preco_robo : 0;
      return s + (c || 0) * i.quantidade;
    }, 0);
    const margemTotal = totalRef > 0 ? ((totalRef - totalCusto) / totalRef) * 100 : 0;

    (rows as any[]).push({
      'Item': '',
      'Descrição': 'TOTAIS',
      'Unid.': '',
      'Qtde': '',
      'Preço Ref. (Edital)': '',
      'Preço Robô (IA)': '',
      'Preço Manual': '',
      'Modo': '',
      'Custo Unit. Final': '',
      'Subtotal Ref.': totalRef,
      'Subtotal Custo': totalCusto,
      'Lucro Estimado': totalRef - totalCusto,
      'Margem %': Number(margemTotal.toFixed(2)),
      'Fontes Robô': '',
    });
    return rows;
  };

  const exportCSV = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotacao_${licitacaoNumero || licitacaoId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const exportXLSX = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 6 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotação');
    XLSX.writeFile(wb, `cotacao_${licitacaoNumero || licitacaoId}.xlsx`);
    toast.success('Excel exportado');
  };

  if (!itensJaExtraidos && itens.length === 0) {
    return (
      <Card className="p-6 text-center space-y-4">
        <div>
          <Sparkles className="w-10 h-10 mx-auto text-primary mb-2 animate-pulse" />
          <h3 className="font-semibold">
            {extrair.isPending ? 'IA lendo o edital…' : 'Preparando planilha automaticamente'}
          </h3>
          <p className="text-sm text-muted-foreground">
            A IA vai extrair os itens e preços de referência do edital.
          </p>
        </div>
        <Button
          onClick={() => extrair.mutate(licitacaoId)}
          disabled={extrair.isPending}
        >
          {extrair.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lendo edital…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Extrair itens com IA</>
          )}
        </Button>
      </Card>
    );
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando itens…</p>;

  const totalRef = itens.reduce((s, i) => s + (i.preco_referencia || 0) * i.quantidade, 0);
  const totalCusto = itens.reduce((s, i) => {
    const c = i.modo_cotacao === 'manual' ? i.preco_manual : i.modo_cotacao === 'robo' ? i.preco_robo : 0;
    return s + (c || 0) * i.quantidade;
  }, 0);
  const margemMedia = itens.filter(i => i.margem_lucro != null).length
    ? itens.reduce((s, i) => s + (i.margem_lucro || 0), 0) / itens.filter(i => i.margem_lucro != null).length
    : null;

  const todosCotados = itens.length > 0 && itens.every(i => i.modo_cotacao === 'robo' || i.modo_cotacao === 'manual' || i.modo_cotacao === 'cancelado');
  const jaAutorizada = licitacaoStatus === 'Autorizada' || licitacaoStatus === 'Em Disputa';

  // Cálculo profissional: custo + tributos + logística → lance mínimo (margem mín) e lance alvo (margem desejada)
  const calcLances = (custoUnit: number | null) => {
    if (!custoUnit || custoUnit <= 0) return { custoFinal: null as number | null, lanceMin: null as number | null, lanceAlvo: null as number | null };
    const custoFinal = custoUnit * (1 + logisticaPct / 100);
    // Preço = custo / (1 - (tributos+margem)/100)  → garante margem líquida desejada
    const denMin = 1 - (tributosPct + margemMinPct) / 100;
    const denAlvo = 1 - (tributosPct + margemAlvoPct) / 100;
    const lanceMin = denMin > 0 ? custoFinal / denMin : null;
    const lanceAlvo = denAlvo > 0 ? custoFinal / denAlvo : null;
    return { custoFinal, lanceMin, lanceAlvo };
  };

  const totalLanceMin = itens.reduce((s, i) => {
    const c = i.modo_cotacao === 'manual' ? i.preco_manual : i.modo_cotacao === 'robo' ? i.preco_robo : 0;
    const { lanceMin } = calcLances(c);
    return s + (lanceMin || 0) * i.quantidade;
  }, 0);
  const totalLanceAlvo = itens.reduce((s, i) => {
    const c = i.modo_cotacao === 'manual' ? i.preco_manual : i.modo_cotacao === 'robo' ? i.preco_robo : 0;
    const { lanceAlvo } = calcLances(c);
    return s + (lanceAlvo || 0) * i.quantidade;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Parâmetros legais — Lei 14.133/2021 */}
      <Card className="p-4 space-y-3 border-primary/20">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Parâmetros tributários e de margem</h4>
            <p className="text-[11px] text-muted-foreground">
              Aplicados a todos os itens. Lance mínimo respeita custo + tributos + logística (sem prejuízo, conforme art. 59 da Lei 14.133/2021). Lance alvo é o ponto de partida na disputa.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div>
            <Label className="text-[10px]">ICMS %</Label>
            <Input type="number" step="0.01" value={icmsPct} onChange={(e) => setIcmsPct(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">PIS+COFINS %</Label>
            <Input type="number" step="0.01" value={pisCofinsPct} onChange={(e) => setPisCofinsPct(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">ISS %</Label>
            <Input type="number" step="0.01" value={issPct} onChange={(e) => setIssPct(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Logística %</Label>
            <Input type="number" step="0.01" value={logisticaPct} onChange={(e) => setLogisticaPct(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Margem mín. %</Label>
            <Input type="number" step="0.01" value={margemMinPct} onChange={(e) => setMargemMinPct(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Margem alvo %</Label>
            <Input type="number" step="0.01" value={margemAlvoPct} onChange={(e) => setMargemAlvoPct(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Tributos totais: <strong>{tributosPct.toFixed(2)}%</strong>. Fórmula do lance: custo × (1 + logística) ÷ (1 − tributos − margem).
        </p>
      </Card>

      {/* Sumário */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Referência (Edital)</p>
          <p className="font-bold text-primary">{fmt(totalRef)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Custo Estimado</p>
          <p className="font-bold">{fmt(totalCusto)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Lance Mínimo (margem {margemMinPct}%)</p>
          <p className="font-bold text-warning">{fmt(totalLanceMin)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Lance Alvo (margem {margemAlvoPct}%)</p>
          <p className="font-bold text-success">{fmt(totalLanceAlvo)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Custo Estimado</p>
          <p className="font-bold">{fmt(totalCusto)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Lucro Estimado</p>
          <p className={`font-bold ${totalRef - totalCusto > 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totalRef - totalCusto)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Margem Média</p>
          <p className={`font-bold ${margemMedia && margemMedia > 0 ? 'text-success' : 'text-destructive'}`}>
            {margemMedia != null ? `${margemMedia.toFixed(1)}%` : '—'}
          </p>
        </Card>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm font-medium">{itens.length} item(ns)</p>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="w-3 h-3 mr-1" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" /> CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportXLSX}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="default" onClick={async () => {
            const pendentes = itens.filter(i => i.preco_robo == null && i.modo_cotacao !== 'manual');
            if (pendentes.length === 0) { toast.info('Todos os itens já foram cotados'); return; }
            toast.info(`Cotando ${pendentes.length} item(ns) com IA…`);
            for (const it of pendentes) {
              try { await cotar.mutateAsync(it); } catch (e) { /* continua */ }
              await new Promise(r => setTimeout(r, 800));
            }
            toast.success('Cotação em lote concluída');
          }} disabled={cotar.isPending}>
            <Sparkles className={`w-3 h-3 mr-1 ${cotar.isPending ? 'animate-pulse' : ''}`} />
            Cotar todos com IA
          </Button>
          <Button size="sm" variant="outline" onClick={() => extrair.mutate(licitacaoId)} disabled={extrair.isPending}>
            <RotateCw className={`w-3 h-3 mr-1 ${extrair.isPending ? 'animate-spin' : ''}`} />
            Re-extrair
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="w-3 h-3 mr-1" /> Descartar licitação
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Descartar esta licitação?</AlertDialogTitle>
                <AlertDialogDescription>
                  A licitação <strong>{licitacaoNumero}</strong> será marcada como Cancelada e sairá da aba de Cotação. A ação fica registrada no log de auditoria.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => descartar.mutate('Sem interesse comercial')}>
                  {descartar.isPending ? 'Descartando…' : 'Confirmar descarte'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabela estilo planilha (Excel) */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-secondary/60 sticky top-0">
            <tr className="text-left">
              <th className="p-2 border-b border-r font-semibold w-12">Item</th>
              <th className="p-2 border-b border-r font-semibold min-w-[260px]">Descrição (Edital)</th>
              <th className="p-2 border-b border-r font-semibold w-16">Unid.</th>
              <th className="p-2 border-b border-r font-semibold w-16 text-right">Qtde</th>
              <th className="p-2 border-b border-r font-semibold w-32 text-right bg-primary/5">Preço Ref. (Edital)</th>
              <th className="p-2 border-b border-r font-semibold w-40 text-right bg-blue-500/5">Preço Robô (IA)</th>
              <th className="p-2 border-b border-r font-semibold w-44 text-right bg-amber-500/5">Cotação Manual</th>
              <th className="p-2 border-b border-r font-semibold w-32 text-right">Subtotal Custo</th>
              <th className="p-2 border-b border-r font-semibold w-32 text-right">Subtotal Ref.</th>
              <th className="p-2 border-b border-r font-semibold w-28 text-right bg-warning/10">Lance Mín.</th>
              <th className="p-2 border-b border-r font-semibold w-28 text-right bg-success/10">Lance Alvo</th>
              <th className="p-2 border-b font-semibold w-24 text-right">Margem</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const custo = item.modo_cotacao === 'manual' ? item.preco_manual : item.modo_cotacao === 'robo' ? item.preco_robo : null;
              const subRef = (item.preco_referencia || 0) * item.quantidade;
              const subCusto = (custo || 0) * item.quantidade;
              const margemOk = (item.margem_lucro ?? 0) > 0;
              const { lanceMin, lanceAlvo } = calcLances(custo);
              const acimaRef = lanceMin != null && item.preco_referencia != null && lanceMin > item.preco_referencia;
              return (
                <tr key={item.id} className={`border-b hover:bg-muted/30 align-top ${item.modo_cotacao === 'cancelado' ? 'opacity-50' : ''}`}>
                  <td className="p-2 border-r font-mono">{item.numero_item}</td>
                  <td className="p-2 border-r">
                    <p className="font-medium leading-snug">{item.descricao}</p>
                    <Badge variant={item.modo_cotacao === 'robo' ? 'default' : item.modo_cotacao === 'manual' ? 'secondary' : 'outline'} className="text-[10px] mt-1">
                      {item.modo_cotacao}
                    </Badge>
                  </td>
                  <td className="p-2 border-r text-center">{item.unidade}</td>
                  <td className="p-2 border-r text-right">{item.quantidade}</td>
                  <td className="p-2 border-r text-right bg-primary/5 font-medium text-primary">
                    {fmt(item.preco_referencia)}
                  </td>
                  <td className="p-2 border-r text-right bg-blue-500/5">
                    {item.preco_robo != null ? (
                      <div className="space-y-1">
                        <p className="font-semibold">{fmt(item.preco_robo)}</p>
                        {item.robo_fontes?.slice(0, 2).map((f, i) => (
                          <div key={i} className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                            <span>{f.loja}: {fmt(f.preco)}</span>
                            {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-2.5 h-2.5" /></a>}
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => handleCancelarRobo(item)}>
                          <X className="w-2.5 h-2.5 mr-0.5" /> limpar
                        </Button>
                      </div>
                    ) : item.observacoes === 'NAO_ENCONTRADO' ? (
                      <div className="space-y-1">
                        <p className="text-destructive font-bold text-[11px]">Não encontrado</p>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => cotar.mutate(item)} disabled={cotar.isPending}>
                          <RotateCw className="w-2.5 h-2.5 mr-0.5" /> tentar novamente
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => cotar.mutate(item)} disabled={cotar.isPending}>
                        {cotar.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" />Cotar</>}
                      </Button>
                    )}
                  </td>
                  <td className="p-2 border-r text-right bg-amber-500/5">
                    {item.preco_manual != null && item.modo_cotacao === 'manual' && (
                      <p className="font-semibold mb-1">{fmt(item.preco_manual)}</p>
                    )}
                    <div className="flex gap-1 justify-end">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="R$ /un"
                        className="h-7 text-xs w-24 text-right"
                        value={editing[item.id] || ''}
                        onChange={(e) => setEditing((s) => ({ ...s, [item.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleManual(item); }}
                      />
                      <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => handleManual(item)}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-2 border-r text-right font-medium">{custo != null ? fmt(subCusto) : '—'}</td>
                  <td className="p-2 border-r text-right font-medium text-primary">{fmt(subRef)}</td>
                  <td className={`p-2 border-r text-right font-semibold bg-warning/5 ${acimaRef ? 'text-destructive' : 'text-warning'}`}>
                    {lanceMin != null ? fmt(lanceMin) : '—'}
                    {acimaRef && <p className="text-[9px] font-normal">acima do ref.</p>}
                  </td>
                  <td className="p-2 border-r text-right font-semibold bg-success/5 text-success">
                    {lanceAlvo != null ? fmt(lanceAlvo) : '—'}
                  </td>
                  <td className={`p-2 text-right font-bold ${margemOk ? 'text-success' : item.margem_lucro != null ? 'text-destructive' : ''}`}>
                    {item.margem_lucro != null ? `${item.margem_lucro.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-secondary font-bold">
              <td colSpan={7} className="p-2 border-r text-right">TOTAIS</td>
              <td className="p-2 border-r text-right">{fmt(totalCusto)}</td>
              <td className="p-2 border-r text-right text-primary">{fmt(totalRef)}</td>
              <td className="p-2 border-r text-right text-warning bg-warning/5">{fmt(totalLanceMin)}</td>
              <td className="p-2 border-r text-right text-success bg-success/5">{fmt(totalLanceAlvo)}</td>
              <td className={`p-2 text-right ${(totalRef - totalCusto) > 0 ? 'text-success' : 'text-destructive'}`}>
                {margemMedia != null ? `${margemMedia.toFixed(1)}%` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {margemMedia != null && margemMedia < 0 && (
        <Card className="p-3 border-destructive bg-destructive/10 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs">
            Margem média negativa. Revise os preços manuais antes de autorizar a Disputa.
          </p>
        </Card>
      )}

      {/* Autorização para Disputa */}
      {itens.length > 0 && (
        <Card className="p-4 border-2 border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold">Autorização para Disputa</h4>
              <p className="text-xs text-muted-foreground">
                Após revisar a planilha, autorize a participação. O robô vai usar exatamente os preços aprovados.
              </p>
            </div>
          </div>
          {jaAutorizada ? (
            <Badge variant="default" className="w-full justify-center py-2">
              <ShieldCheck className="w-4 h-4 mr-2" /> Já autorizada — em Disputa
            </Badge>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="authorize"
                  className="w-full"
                  disabled={!todosCotados || (margemMedia != null && margemMedia < 0)}
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  AUTORIZAR PARA DISPUTA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Autorizar participação na disputa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você está autorizando o robô a participar da licitação <strong>{licitacaoNumero}</strong> com {itens.length} item(ns), custo total estimado de <strong>{fmt(totalCusto)}</strong> e margem média de <strong>{margemMedia?.toFixed(1)}%</strong>. Esta ação fica registrada no log de auditoria.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => autorizarDisputa.mutate()}>
                    {autorizarDisputa.isPending ? 'Autorizando…' : 'Confirmar autorização'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!todosCotados && !jaAutorizada && (
            <p className="text-xs text-muted-foreground text-center">
              Cote (robô ou manual) todos os itens antes de autorizar.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
