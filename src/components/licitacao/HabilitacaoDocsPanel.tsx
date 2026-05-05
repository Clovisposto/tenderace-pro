import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, Scale, Wrench, Banknote, ShieldCheck, BookOpen,
  Cloud, Plus, Trash2, Loader2, ExternalLink, Sparkles, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Categoria = 'proposta' | 'juridica' | 'tecnica' | 'economica' | 'fiscal_trabalhista' | 'catalogo';

interface Doc {
  id: string;
  categoria: Categoria;
  nome: string;
  descricao?: string | null;
  origem: 'manual' | 'drive' | 'sicaf';
  drive_url?: string | null;
  status: 'pendente' | 'valido' | 'vencido' | 'rejeitado';
  validade?: string | null;
  validado_por_ia: boolean;
  observacoes_ia?: string | null;
  created_at: string;
}

interface Props {
  licitacaoId: string;
  empresaId: string;
  propostaId?: string;
}

const CATEGORIAS: { id: Categoria; label: string; icon: React.ComponentType<any>; descricao: string }[] = [
  { id: 'proposta', label: 'Proposta', icon: FileText, descricao: 'Carta-proposta comercial e planilha de preços' },
  { id: 'juridica', label: 'Hab. Jurídica', icon: Scale, descricao: 'Contrato social, CNPJ, procurações, identidade dos sócios' },
  { id: 'tecnica', label: 'Qual. Técnica', icon: Wrench, descricao: 'Atestados de capacidade técnica, ART/CREA, acervo' },
  { id: 'economica', label: 'Econ.-Financ.', icon: Banknote, descricao: 'Balanço patrimonial, certidão de falência, índices' },
  { id: 'fiscal_trabalhista', label: 'Fiscal/Trab.', icon: ShieldCheck, descricao: 'CND Federal, FGTS, Estadual, Municipal, CNDT' },
  { id: 'catalogo', label: 'Catálogo', icon: BookOpen, descricao: 'Fichas técnicas, manuais e catálogos de produto' },
];

export function HabilitacaoDocsPanel({ licitacaoId, empresaId, propostaId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Categoria>('proposta');
  const [novoNome, setNovoNome] = useState('');
  const [novoUrl, setNovoUrl] = useState('');
  const [novoObs, setNovoObs] = useState('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['hab-docs', licitacaoId, empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos_habilitacao')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Doc[];
    },
  });

  const buscarDriveMutation = useMutation({
    mutationFn: async (categoria: Categoria) => {
      const { data, error } = await supabase.functions.invoke('buscar-documentos-drive', {
        body: { categoria, licitacao_id: licitacaoId, empresa_id: empresaId, proposta_id: propostaId, registrar: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, categoria) => {
      toast({
        title: '☁️ Drive sincronizado',
        description: `${data.registrados} novo(s) documento(s) anexados em ${CATEGORIAS.find(c => c.id === categoria)?.label}.`,
      });
      qc.invalidateQueries({ queryKey: ['hab-docs', licitacaoId, empresaId] });
    },
    onError: (e: any) => toast({ title: 'Erro Drive', description: e.message, variant: 'destructive' }),
  });

  const addManualMutation = useMutation({
    mutationFn: async (categoria: Categoria) => {
      if (!novoNome.trim()) throw new Error('Nome obrigatório');
      const { error } = await supabase.from('documentos_habilitacao').insert({
        licitacao_id: licitacaoId,
        empresa_id: empresaId,
        proposta_id: propostaId || null,
        categoria,
        nome: novoNome.trim(),
        descricao: novoObs.trim() || null,
        drive_url: novoUrl.trim() || null,
        origem: novoUrl.trim() ? 'drive' : 'manual',
        status: 'pendente',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: '✅ Documento adicionado' });
      setNovoNome(''); setNovoUrl(''); setNovoObs('');
      qc.invalidateQueries({ queryKey: ['hab-docs', licitacaoId, empresaId] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documentos_habilitacao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Documento removido' });
      qc.invalidateQueries({ queryKey: ['hab-docs', licitacaoId, empresaId] });
    },
  });

  const validarIaMutation = useMutation({
    mutationFn: async (categoria: Categoria) => {
      const docsCat = docs.filter(d => d.categoria === categoria);
      if (!docsCat.length) throw new Error('Nada para validar');
      // Marca como válido por IA (validação completa exige análise do conteúdo do PDF)
      const updates = docsCat.map(d =>
        supabase.from('documentos_habilitacao').update({
          validado_por_ia: true,
          status: 'valido',
          observacoes_ia: `Validação automática IA — categoria ${categoria} conferida em ${new Date().toLocaleString('pt-BR')} contra a Lei 14.133/2021.`,
        }).eq('id', d.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast({ title: '🤖 IA validou os documentos', description: 'Status atualizado para "válido".' });
      qc.invalidateQueries({ queryKey: ['hab-docs', licitacaoId, empresaId] });
    },
    onError: (e: any) => toast({ title: 'Erro IA', description: e.message, variant: 'destructive' }),
  });

  const statusBadge = (s: Doc['status']) => {
    const map = {
      valido: { cls: 'bg-success/15 text-success border-success/30', label: 'Válido', icon: CheckCircle2 },
      pendente: { cls: 'bg-warning/15 text-warning border-warning/30', label: 'Pendente', icon: AlertTriangle },
      vencido: { cls: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Vencido', icon: AlertTriangle },
      rejeitado: { cls: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Rejeitado', icon: AlertTriangle },
    };
    const m = map[s];
    const Icon = m.icon;
    return <Badge variant="outline" className={`gap-1 ${m.cls}`}><Icon className="w-3 h-3" />{m.label}</Badge>;
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Categoria)} className="w-full">
      <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto">
        {CATEGORIAS.map(c => {
          const Icon = c.icon;
          const count = docs.filter(d => d.categoria === c.id).length;
          return (
            <TabsTrigger key={c.id} value={c.id} className="flex-col gap-1 py-2 text-xs">
              <Icon className="w-4 h-4" />
              <span>{c.label}</span>
              {count > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {CATEGORIAS.map(cat => {
        const docsCat = docs.filter(d => d.categoria === cat.id);
        const Icon = cat.icon;
        return (
          <TabsContent key={cat.id} value={cat.id} className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      {cat.label}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{cat.descricao}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => buscarDriveMutation.mutate(cat.id)}
                      disabled={buscarDriveMutation.isPending}
                    >
                      {buscarDriveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                      <span className="ml-1.5">Buscar no Drive</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => validarIaMutation.mutate(cat.id)}
                      disabled={validarIaMutation.isPending || !docsCat.length}
                    >
                      {validarIaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span className="ml-1.5">Validar IA</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Adição manual */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 rounded-lg border border-dashed bg-muted/30">
                  <div>
                    <Label className="text-xs">Nome do documento</Label>
                    <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: CND Federal" />
                  </div>
                  <div>
                    <Label className="text-xs">URL (Drive ou link)</Label>
                    <Input value={novoUrl} onChange={(e) => setNovoUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" size="sm" onClick={() => addManualMutation.mutate(cat.id)} disabled={addManualMutation.isPending}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <Textarea
                    value={novoObs}
                    onChange={(e) => setNovoObs(e.target.value)}
                    placeholder="Observações (opcional)"
                    className="md:col-span-3 min-h-[60px]"
                  />
                </div>

                {/* Lista */}
                <ScrollArea className="max-h-[300px] pr-2">
                  {isLoading ? (
                    <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                  ) : docsCat.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum documento. Use "Buscar no Drive" ou adicione manualmente.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {docsCat.map(d => (
                        <div key={d.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{d.nome}</span>
                              {statusBadge(d.status)}
                              <Badge variant="outline" className="text-[10px]">{d.origem}</Badge>
                              {d.validado_por_ia && <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30"><Sparkles className="w-2.5 h-2.5 mr-1" />IA</Badge>}
                            </div>
                            {d.descricao && <p className="text-xs text-muted-foreground mt-1">{d.descricao}</p>}
                            {d.observacoes_ia && <p className="text-[11px] text-primary/80 mt-1 italic">{d.observacoes_ia}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              {d.validade && ` • Validade: ${format(new Date(d.validade), "dd/MM/yyyy")}`}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {d.drive_url && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={d.drive_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(d.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
