import { useState } from 'react';
import { Sparkles, Loader2, RotateCw, Edit3, X, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
}

const fmt = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const PlanilhaCotacao = ({ licitacaoId, itensJaExtraidos }: Props) => {
  const { data: itens = [], isLoading } = useLicitacaoItens(licitacaoId);
  const extrair = useExtrairItens();
  const cotar = useCotarItemRobo();
  const update = useUpdateItem();
  const [editing, setEditing] = useState<Record<string, string>>({});

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

  if (!itensJaExtraidos && itens.length === 0) {
    return (
      <Card className="p-6 text-center space-y-4">
        <div>
          <Sparkles className="w-10 h-10 mx-auto text-primary mb-2" />
          <h3 className="font-semibold">Planilha de cotação ainda não foi montada</h3>
          <p className="text-sm text-muted-foreground">
            A IA vai ler o edital e criar a lista de itens com preço de referência.
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
  const totalCusto = itens.reduce((s, i) => s + (i.custo_estimado || 0) * i.quantidade, 0);
  const margemMedia = itens.filter(i => i.margem_lucro != null).length
    ? itens.reduce((s, i) => s + (i.margem_lucro || 0), 0) / itens.filter(i => i.margem_lucro != null).length
    : null;

  return (
    <div className="space-y-4">
      {/* Sumário */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Referência (Edital)</p>
          <p className="font-bold text-primary">{fmt(totalRef)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Custo Estimado</p>
          <p className="font-bold">{fmt(totalCusto)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Margem Média</p>
          <p className={`font-bold ${margemMedia && margemMedia > 0 ? 'text-success' : 'text-destructive'}`}>
            {margemMedia != null ? `${margemMedia.toFixed(1)}%` : '—'}
          </p>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{itens.length} item(ns)</p>
        <Button size="sm" variant="outline" onClick={() => extrair.mutate(licitacaoId)} disabled={extrair.isPending}>
          <RotateCw className={`w-3 h-3 mr-1 ${extrair.isPending ? 'animate-spin' : ''}`} />
          Re-extrair do edital
        </Button>
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

            {/* Cotação Robô */}
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

            {/* Preço manual */}
            {item.preco_manual != null && item.modo_cotacao === 'manual' && (
              <div className="bg-secondary/40 rounded p-2 text-xs mb-2">
                <span className="font-medium">Manual: {fmt(item.preco_manual)}/un</span>
              </div>
            )}

            {/* Ações */}
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
    </div>
  );
};
