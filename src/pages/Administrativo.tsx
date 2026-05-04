import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Package, ArrowDownToLine, ArrowUpFromLine, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

type Lancamento = {
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  tipo: 'entrada' | 'saida';
  valor: number;
};

type ItemEstoque = {
  id: string;
  sku: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custoMedio: number;
  precoVenda: number;
};

const TAB_PARAM_KEY = 'tab';
const VALID_TABS = ['caixa', 'estoque', 'entradas', 'saidas'] as const;

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Administrativo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get(TAB_PARAM_KEY);
  const activeTab = (VALID_TABS as readonly string[]).includes(tabParam || '')
    ? (tabParam as string)
    : 'caixa';
  const setActiveTab = (t: string) => setSearchParams({ [TAB_PARAM_KEY]: t }, { replace: true });

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);

  // Form Livro Caixa
  const [novoLanc, setNovoLanc] = useState({
    descricao: '',
    categoria: 'Operacional',
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
  });

  // Form Estoque
  const [novoItem, setNovoItem] = useState({
    sku: '',
    nome: '',
    quantidade: '',
    unidade: 'un',
    custoMedio: '',
    precoVenda: '',
  });

  // Form Entrada/Saída
  const [movimento, setMovimento] = useState({ itemId: '', quantidade: '', valorUnit: '' });

  const totais = useMemo(() => {
    const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
    const saidas = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [lancamentos]);

  const adicionarLancamento = () => {
    const valor = parseFloat(novoLanc.valor);
    if (!novoLanc.descricao || !valor || valor <= 0) {
      toast.error('Preencha descrição e valor válido');
      return;
    }
    setLancamentos(prev => [
      {
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        descricao: novoLanc.descricao,
        categoria: novoLanc.categoria,
        tipo: novoLanc.tipo,
        valor,
      },
      ...prev,
    ]);
    setNovoLanc({ descricao: '', categoria: 'Operacional', tipo: 'entrada', valor: '' });
    toast.success('Lançamento adicionado ao Livro Caixa');
  };

  const adicionarItem = () => {
    if (!novoItem.sku || !novoItem.nome) {
      toast.error('Informe SKU e nome do item');
      return;
    }
    setEstoque(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sku: novoItem.sku,
        nome: novoItem.nome,
        quantidade: parseFloat(novoItem.quantidade) || 0,
        unidade: novoItem.unidade,
        custoMedio: parseFloat(novoItem.custoMedio) || 0,
        precoVenda: parseFloat(novoItem.precoVenda) || 0,
      },
    ]);
    setNovoItem({ sku: '', nome: '', quantidade: '', unidade: 'un', custoMedio: '', precoVenda: '' });
    toast.success('Item cadastrado no estoque');
  };

  const movimentar = (tipo: 'entrada' | 'saida') => {
    const item = estoque.find(i => i.id === movimento.itemId);
    const qtd = parseFloat(movimento.quantidade);
    const valorUnit = parseFloat(movimento.valorUnit) || (item?.custoMedio ?? 0);
    if (!item || !qtd || qtd <= 0) {
      toast.error('Selecione um item e informe a quantidade');
      return;
    }
    if (tipo === 'saida' && qtd > item.quantidade) {
      toast.error('Quantidade indisponível em estoque');
      return;
    }
    setEstoque(prev =>
      prev.map(i =>
        i.id === item.id
          ? {
              ...i,
              quantidade: tipo === 'entrada' ? i.quantidade + qtd : i.quantidade - qtd,
              custoMedio:
                tipo === 'entrada' && i.quantidade + qtd > 0
                  ? (i.custoMedio * i.quantidade + valorUnit * qtd) / (i.quantidade + qtd)
                  : i.custoMedio,
            }
          : i
      )
    );
    // Lança no caixa automaticamente
    setLancamentos(prev => [
      {
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        descricao: `${tipo === 'entrada' ? 'Compra' : 'Venda'} de ${qtd} ${item.unidade} - ${item.nome}`,
        categoria: tipo === 'entrada' ? 'Compra de Mercadoria' : 'Venda de Mercadoria',
        tipo: tipo === 'entrada' ? 'saida' : 'entrada',
        valor: qtd * valorUnit,
      },
      ...prev,
    ]);
    setMovimento({ itemId: '', quantidade: '', valorUnit: '' });
    toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada e lançada no caixa`);
  };

  return (
    <MainLayout title="Administrativo">
      <div className="space-y-6">
        {/* Resumo financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entradas</p>
                  <p className="text-2xl font-bold text-success">{formatBRL(totais.entradas)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-success/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saídas</p>
                  <p className="text-2xl font-bold text-destructive">{formatBRL(totais.saidas)}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-destructive/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatBRL(totais.saldo)}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="caixa"><Wallet className="w-4 h-4 mr-1" />Livro Caixa</TabsTrigger>
            <TabsTrigger value="estoque"><Package className="w-4 h-4 mr-1" />Estoque</TabsTrigger>
            <TabsTrigger value="entradas"><ArrowDownToLine className="w-4 h-4 mr-1" />Entradas</TabsTrigger>
            <TabsTrigger value="saidas"><ArrowUpFromLine className="w-4 h-4 mr-1" />Saídas</TabsTrigger>
          </TabsList>

          {/* LIVRO CAIXA */}
          <TabsContent value="caixa" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle>Novo Lançamento</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <Label>Descrição</Label>
                  <Input value={novoLanc.descricao} onChange={(e) => setNovoLanc({ ...novoLanc, descricao: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input value={novoLanc.categoria} onChange={(e) => setNovoLanc({ ...novoLanc, categoria: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={novoLanc.tipo} onValueChange={(v: any) => setNovoLanc({ ...novoLanc, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={novoLanc.valor} onChange={(e) => setNovoLanc({ ...novoLanc, valor: e.target.value })} />
                </div>
                <div className="md:col-span-5">
                  <Button onClick={adicionarLancamento} className="w-full md:w-auto"><Plus className="w-4 h-4 mr-2" />Lançar</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
              <CardContent>
                {lancamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum lançamento registrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentos.map(l => (
                        <TableRow key={l.id}>
                          <TableCell>{new Date(l.data).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{l.descricao}</TableCell>
                          <TableCell>{l.categoria}</TableCell>
                          <TableCell>
                            <Badge variant={l.tipo === 'entrada' ? 'default' : 'destructive'}>
                              {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${l.tipo === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                            {l.tipo === 'entrada' ? '+' : '-'} {formatBRL(l.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ESTOQUE */}
          <TabsContent value="estoque" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle>Cadastrar Item</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div><Label>SKU</Label><Input value={novoItem.sku} onChange={(e) => setNovoItem({ ...novoItem, sku: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Nome</Label><Input value={novoItem.nome} onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })} /></div>
                <div><Label>Qtde</Label><Input type="number" value={novoItem.quantidade} onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })} /></div>
                <div><Label>Unidade</Label><Input value={novoItem.unidade} onChange={(e) => setNovoItem({ ...novoItem, unidade: e.target.value })} /></div>
                <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={novoItem.custoMedio} onChange={(e) => setNovoItem({ ...novoItem, custoMedio: e.target.value })} /></div>
                <div><Label>Preço Venda</Label><Input type="number" step="0.01" value={novoItem.precoVenda} onChange={(e) => setNovoItem({ ...novoItem, precoVenda: e.target.value })} /></div>
                <div className="md:col-span-6"><Button onClick={adicionarItem}><Plus className="w-4 h-4 mr-2" />Cadastrar Item</Button></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Itens em Estoque</CardTitle></CardHeader>
              <CardContent>
                {estoque.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum item cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-right">Qtde</TableHead>
                        <TableHead className="text-right">Custo Médio</TableHead>
                        <TableHead className="text-right">Preço Venda</TableHead>
                        <TableHead className="text-right">Margem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estoque.map(i => {
                        const margem = i.custoMedio > 0 ? ((i.precoVenda - i.custoMedio) / i.custoMedio) * 100 : 0;
                        return (
                          <TableRow key={i.id}>
                            <TableCell className="font-mono text-xs">{i.sku}</TableCell>
                            <TableCell>{i.nome}</TableCell>
                            <TableCell className="text-right">{i.quantidade} {i.unidade}</TableCell>
                            <TableCell className="text-right">{formatBRL(i.custoMedio)}</TableCell>
                            <TableCell className="text-right">{formatBRL(i.precoVenda)}</TableCell>
                            <TableCell className={`text-right font-semibold ${margem >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {margem.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ENTRADAS / SAÍDAS */}
          {(['entradas', 'saidas'] as const).map(tipo => (
            <TabsContent key={tipo} value={tipo} className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tipo === 'entradas' ? 'Entrada de Mercadoria' : 'Saída de Mercadoria'}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label>Item</Label>
                    <Select value={movimento.itemId} onValueChange={(v) => setMovimento({ ...movimento, itemId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {estoque.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.nome} ({i.quantidade} {i.unidade})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantidade</Label><Input type="number" value={movimento.quantidade} onChange={(e) => setMovimento({ ...movimento, quantidade: e.target.value })} /></div>
                  <div><Label>Valor unitário (R$)</Label><Input type="number" step="0.01" value={movimento.valorUnit} onChange={(e) => setMovimento({ ...movimento, valorUnit: e.target.value })} /></div>
                  <div className="md:col-span-4">
                    <Button onClick={() => movimentar(tipo === 'entradas' ? 'entrada' : 'saida')}>
                      {tipo === 'entradas' ? <ArrowDownToLine className="w-4 h-4 mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
                      Registrar {tipo === 'entradas' ? 'Entrada' : 'Saída'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      O movimento atualiza o estoque e gera lançamento automático no Livro Caixa.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Administrativo;
