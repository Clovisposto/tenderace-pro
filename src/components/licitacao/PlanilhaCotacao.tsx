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

  return (
    <div className="space-y-4">
      {/* Sumário */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Referência (Edital)</p>
          <p className="font-bold text-primary">{fmt(totalRef)}</p>
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
          <Button size="sm" variant="outline" onClick={() => extrair.mutate(licitacaoId)} disabled={extrair.isPending}>
            <RotateCw className={`w-3 h-3 mr-1 ${extrair.isPending ? 'animate-spin' : ''}`} />
            Re-extrair
          </Button>
        </div>
      </div>

      {/* Itens */}
      <div className="space-y-3">
        {itens.map((item) => (
          <Card key={item.id} className={`p-4 ${item.modo_cotacao === 'cancelado' ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">#{item.numero_item}</Badge>
                  <Badge variant={
                    item.modo_cotacao === 'robo' ? 'default' :
                    item.modo_cotacao === 'manual' ? 'secondary' :
                    item.modo_cotacao === 'cancelado' ? 'destructive' : 'outline'
                  }>
                    {item.modo_cotacao}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{item.descricao}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.quantidade} {item.unidade} • Ref: {fmt(item.preco_referencia)}/un
                </p>
              </div>
              {item.margem_lucro != null && (
                <div className={`text-right ${item.margem_lucro > 0 ? 'text-success' : 'text-destructive'}`}>
                  <TrendingUp className="w-4 h-4 inline" />
                  <p className="text-lg font-bold">{item.margem_lucro.toFixed(1)}%</p>
                  <p className="text-xs">margem</p>
                </div>
              )}
            </div>

            {item.preco_robo != null && (
              <div className="bg-muted/40 rounded p-2 text-xs space-y-1 mb-2">
                <div className="flex justify-between font-medium">
                  <span>Robô: {fmt(item.preco_robo)}/un</span>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleCancelarRobo(item)}>
                    <X className="w-3 h-3 mr-1" /> Cancelar
                  </Button>
                </div>
                {item.robo_fontes?.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{f.loja} {f.endereco && `· ${f.endereco}`}</span>
                    <span className="flex items-center gap-1">
                      {fmt(f.preco)}
                      {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {item.preco_manual != null && item.modo_cotacao === 'manual' && (
              <div className="bg-secondary/40 rounded p-2 text-xs mb-2">
                <span className="font-medium">Manual: {fmt(item.preco_manual)}/un</span>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => cotar.mutate(item)}
                disabled={cotar.isPending}
              >
                {cotar.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Cotar com Robô
              </Button>

              <div className="flex gap-1 flex-1 min-w-[200px]">
                <Input
                  type="number"
                  placeholder="Preço manual R$"
                  className="h-8 text-xs"
                  value={editing[item.id] || ''}
                  onChange={(e) => setEditing((s) => ({ ...s, [item.id]: e.target.value }))}
                />
                <Button size="sm" variant="secondary" onClick={() => handleManual(item)}>
                  <Edit3 className="w-3 h-3 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          </Card>
        ))}
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
