import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Wallet,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  TrendingUp,
  TrendingDown,
  FileText,
  Send,
  CheckCircle2,
} from 'lucide-react';
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
  ncm: string;
  cfop: string;
  quantidade: number;
  unidade: string;
  custoMedio: number;
  precoVenda: number;
};

type NotaFiscal = {
  id: string;
  numero: string;
  serie: string;
  destinatario: string;
  cnpjDestinatario: string;
  itemId: string;
  quantidade: number;
  valorTotal: number;
  status: 'rascunho' | 'transmitida' | 'autorizada' | 'rejeitada';
  protocolo?: string;
  emitidaEm: string;
};

const TAB_PARAM_KEY = 'tab';
const VALID_TABS = ['caixa', 'estoque', 'entradas', 'saidas', 'nfe'] as const;

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Financeiro = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get(TAB_PARAM_KEY);
  const activeTab = (VALID_TABS as readonly string[]).includes(tabParam || '')
    ? (tabParam as string)
    : 'caixa';
  const setActiveTab = (t: string) => setSearchParams({ [TAB_PARAM_KEY]: t }, { replace: true });

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);

  // Forms
  const [novoLanc, setNovoLanc] = useState({
    descricao: '',
    categoria: 'Operacional',
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
  });
  const [novoItem, setNovoItem] = useState({
    sku: '',
    nome: '',
    ncm: '',
    cfop: '5102',
    quantidade: '',
    unidade: 'un',
    custoMedio: '',
    precoVenda: '',
  });
  const [movimento, setMovimento] = useState({ itemId: '', quantidade: '', valorUnit: '', emitirNota: false });
  const [novaNota, setNovaNota] = useState({
    destinatario: '',
    cnpjDestinatario: '',
    itemId: '',
    quantidade: '',
    observacoes: '',
  });

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
      { id: crypto.randomUUID(), data: new Date().toISOString(), ...novoLanc, valor },
      ...prev,
    ]);
    setNovoLanc({ descricao: '', categoria: 'Operacional', tipo: 'entrada', valor: '' });
    toast.success('Lançamento registrado');
  };

  const adicionarItem = () => {
    if (!novoItem.sku || !novoItem.nome) {
      toast.error('Informe SKU e nome');
      return;
    }
    setEstoque(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sku: novoItem.sku,
        nome: novoItem.nome,
        ncm: novoItem.ncm,
        cfop: novoItem.cfop,
        quantidade: parseFloat(novoItem.quantidade) || 0,
        unidade: novoItem.unidade,
        custoMedio: parseFloat(novoItem.custoMedio) || 0,
        precoVenda: parseFloat(novoItem.precoVenda) || 0,
      },
    ]);
    setNovoItem({ sku: '', nome: '', ncm: '', cfop: '5102', quantidade: '', unidade: 'un', custoMedio: '', precoVenda: '' });
    toast.success('Item cadastrado no estoque');
  };

  const movimentar = (tipo: 'entrada' | 'saida') => {
    const item = estoque.find(i => i.id === movimento.itemId);
    const qtd = parseFloat(movimento.quantidade);
    const valorUnit = parseFloat(movimento.valorUnit) || (item?.custoMedio ?? 0);
    if (!item || !qtd || qtd <= 0) {
      toast.error('Selecione item e quantidade');
      return;
    }
    if (tipo === 'saida' && qtd > item.quantidade) {
      toast.error('Quantidade indisponível');
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
    if (tipo === 'saida' && movimento.emitirNota) {
      emitirNotaAuto(item, qtd, qtd * valorUnit);
    }
    setMovimento({ itemId: '', quantidade: '', valorUnit: '', emitirNota: false });
    toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada`);
  };

  const emitirNotaAuto = (item: ItemEstoque, qtd: number, valor: number) => {
    const nota: NotaFiscal = {
      id: crypto.randomUUID(),
      numero: String(notas.length + 1).padStart(6, '0'),
      serie: '1',
      destinatario: 'Consumidor',
      cnpjDestinatario: '',
      itemId: item.id,
      quantidade: qtd,
      valorTotal: valor,
      status: 'rascunho',
      emitidaEm: new Date().toISOString(),
    };
    setNotas(prev => [nota, ...prev]);
    toast.info(`NF-e ${nota.numero} criada como rascunho`);
  };

  const emitirNota = () => {
    const item = estoque.find(i => i.id === novaNota.itemId);
    const qtd = parseFloat(novaNota.quantidade);
    if (!item || !qtd || !novaNota.destinatario) {
      toast.error('Preencha destinatário, item e quantidade');
      return;
    }
    const valor = qtd * item.precoVenda;
    const nota: NotaFiscal = {
      id: crypto.randomUUID(),
      numero: String(notas.length + 1).padStart(6, '0'),
      serie: '1',
      destinatario: novaNota.destinatario,
      cnpjDestinatario: novaNota.cnpjDestinatario,
      itemId: item.id,
      quantidade: qtd,
      valorTotal: valor,
      status: 'rascunho',
      emitidaEm: new Date().toISOString(),
    };
    setNotas(prev => [nota, ...prev]);
    setNovaNota({ destinatario: '', cnpjDestinatario: '', itemId: '', quantidade: '', observacoes: '' });
    toast.success(`NF-e ${nota.numero} criada`);
  };

  const transmitirSefaz = (id: string) => {
    setNotas(prev => prev.map(n => (n.id === id ? { ...n, status: 'transmitida' } : n)));
    toast.info('Transmitindo para a SEFAZ...');
    setTimeout(() => {
      setNotas(prev =>
        prev.map(n =>
          n.id === id
            ? {
                ...n,
                status: 'autorizada',
                protocolo: `135${Date.now().toString().slice(-10)}`,
              }
            : n
        )
      );
      toast.success('NF-e autorizada pela SEFAZ');
    }, 1500);
  };

  const statusBadge = (s: NotaFiscal['status']) => {
    const map = {
      rascunho: { v: 'secondary' as const, l: 'Rascunho' },
      transmitida: { v: 'default' as const, l: 'Transmitindo' },
      autorizada: { v: 'default' as const, l: 'Autorizada' },
      rejeitada: { v: 'destructive' as const, l: 'Rejeitada' },
    };
    return <Badge variant={map[s].v}>{map[s].l}</Badge>;
  };

  return (
    <MainLayout title="Financeiro">
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">NF-e Emitidas</p>
                  <p className="text-2xl font-bold">{notas.filter(n => n.status === 'autorizada').length}</p>
                </div>
                <FileText className="w-8 h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="caixa"><Wallet className="w-4 h-4 mr-1" />Livro Caixa</TabsTrigger>
            <TabsTrigger value="estoque"><Package className="w-4 h-4 mr-1" />Estoque</TabsTrigger>
            <TabsTrigger value="entradas"><ArrowDownToLine className="w-4 h-4 mr-1" />Entradas</TabsTrigger>
            <TabsTrigger value="saidas"><ArrowUpFromLine className="w-4 h-4 mr-1" />Saídas</TabsTrigger>
            <TabsTrigger value="nfe"><FileText className="w-4 h-4 mr-1" />Nota Fiscal</TabsTrigger>
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
                  <Button onClick={adicionarLancamento}><Plus className="w-4 h-4 mr-2" />Lançar</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
              <CardContent>
                {lancamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum lançamento.</p>
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
              <CardContent className="grid grid-cols-2 md:grid-cols-8 gap-3">
                <div><Label>SKU</Label><Input value={novoItem.sku} onChange={(e) => setNovoItem({ ...novoItem, sku: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Nome</Label><Input value={novoItem.nome} onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })} /></div>
                <div><Label>NCM</Label><Input value={novoItem.ncm} onChange={(e) => setNovoItem({ ...novoItem, ncm: e.target.value })} /></div>
                <div><Label>CFOP</Label><Input value={novoItem.cfop} onChange={(e) => setNovoItem({ ...novoItem, cfop: e.target.value })} /></div>
                <div><Label>Qtde</Label><Input type="number" value={novoItem.quantidade} onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })} /></div>
                <div><Label>Custo</Label><Input type="number" step="0.01" value={novoItem.custoMedio} onChange={(e) => setNovoItem({ ...novoItem, custoMedio: e.target.value })} /></div>
                <div><Label>Preço</Label><Input type="number" step="0.01" value={novoItem.precoVenda} onChange={(e) => setNovoItem({ ...novoItem, precoVenda: e.target.value })} /></div>
                <div className="md:col-span-8"><Button onClick={adicionarItem}><Plus className="w-4 h-4 mr-2" />Cadastrar</Button></div>
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
                        <TableHead>NCM</TableHead>
                        <TableHead className="text-right">Qtde</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
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
                            <TableCell className="font-mono text-xs">{i.ncm}</TableCell>
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
                  <CardDescription>
                    {tipo === 'entradas'
                      ? 'Compra: aumenta estoque, recalcula custo médio e gera saída no caixa.'
                      : 'Venda: baixa estoque, gera entrada no caixa e (opcional) emite NF-e.'}
                  </CardDescription>
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
                  {tipo === 'saidas' && (
                    <div className="md:col-span-4 flex items-center gap-2">
                      <input
                        id="emitirNota"
                        type="checkbox"
                        checked={movimento.emitirNota}
                        onChange={(e) => setMovimento({ ...movimento, emitirNota: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="emitirNota" className="cursor-pointer">Emitir NF-e automaticamente após saída</Label>
                    </div>
                  )}
                  <div className="md:col-span-4">
                    <Button onClick={() => movimentar(tipo === 'entradas' ? 'entrada' : 'saida')}>
                      {tipo === 'entradas' ? <ArrowDownToLine className="w-4 h-4 mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
                      Registrar {tipo === 'entradas' ? 'Entrada' : 'Saída'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* NF-e */}
          <TabsContent value="nfe" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Emitir NF-e</CardTitle>
                <CardDescription>
                  Geração e transmissão para a SEFAZ. Certificado digital A1 e configuração SEFAZ via{' '}
                  <strong>Configurações → Empresa</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Label>Destinatário (Razão Social)</Label>
                  <Input value={novaNota.destinatario} onChange={(e) => setNovaNota({ ...novaNota, destinatario: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>CNPJ/CPF</Label>
                  <Input value={novaNota.cnpjDestinatario} onChange={(e) => setNovaNota({ ...novaNota, cnpjDestinatario: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Item</Label>
                  <Select value={novaNota.itemId} onValueChange={(v) => setNovaNota({ ...novaNota, itemId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {estoque.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.nome} — {formatBRL(i.precoVenda)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" value={novaNota.quantidade} onChange={(e) => setNovaNota({ ...novaNota, quantidade: e.target.value })} />
                </div>
                <div>
                  <Label>Total</Label>
                  <Input
                    readOnly
                    value={(() => {
                      const it = estoque.find(i => i.id === novaNota.itemId);
                      const q = parseFloat(novaNota.quantidade) || 0;
                      return it ? formatBRL(it.precoVenda * q) : 'R$ 0,00';
                    })()}
                  />
                </div>
                <div className="md:col-span-4">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={novaNota.observacoes} onChange={(e) => setNovaNota({ ...novaNota, observacoes: e.target.value })} />
                </div>
                <div className="md:col-span-4">
                  <Button onClick={emitirNota}><Plus className="w-4 h-4 mr-2" />Gerar NF-e (Rascunho)</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notas Fiscais</CardTitle></CardHeader>
              <CardContent>
                {notas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma NF-e emitida.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notas.map(n => (
                        <TableRow key={n.id}>
                          <TableCell className="font-mono">{n.numero}/{n.serie}</TableCell>
                          <TableCell>{n.destinatario}</TableCell>
                          <TableCell>{new Date(n.emitidaEm).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-mono">{formatBRL(n.valorTotal)}</TableCell>
                          <TableCell>{statusBadge(n.status)}</TableCell>
                          <TableCell className="font-mono text-xs">{n.protocolo || '-'}</TableCell>
                          <TableCell className="text-right">
                            {n.status === 'rascunho' && (
                              <Button size="sm" variant="default" onClick={() => transmitirSefaz(n.id)}>
                                <Send className="w-3 h-3 mr-1" />SEFAZ
                              </Button>
                            )}
                            {n.status === 'autorizada' && (
                              <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Financeiro;
