import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Calendar,
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  Award,
  Phone,
  Mail,
  CreditCard,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useEmpresas, useCreateEmpresa, useUpdateEmpresa, useDeleteEmpresa } from '@/hooks/useEmpresas';
import type { Empresa, EmpresaInsert } from '@/hooks/useEmpresas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ─── Empty state ────────────────────────────────────────────────────────────
const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-6 rounded-full bg-primary/10 mb-6">
      <Building2 className="w-12 h-12 text-primary" />
    </div>
    <h3 className="text-xl font-bold mb-2">Nenhuma empresa cadastrada</h3>
    <p className="text-muted-foreground text-sm max-w-sm mb-6">
      Cadastre sua empresa para começar a participar de licitações e usar o sistema de compliance.
    </p>
    <Button onClick={onAdd} className="gap-2">
      <Plus className="w-4 h-4" />
      Cadastrar Primeira Empresa
    </Button>
  </div>
);

// ─── Empresa Form Modal ──────────────────────────────────────────────────────
interface EmpresaFormModalProps {
  open: boolean;
  onClose: () => void;
  empresa?: Empresa | null;
}

const EMPTY_FORM = {
  nome: '',
  cnpj: '',
  razao_social: '',
  segmento: 'Empreendimentos' as 'Medicamentos' | 'Empreendimentos',
  uf: '',
  municipio: '',
  endereco: '',
  telefone: '',
  email: '',
  cnae_codigo: '',
  cnae_descricao: '',
  sicaf_status: 'Pendente',
  certidoes_validas: false,
};

const EmpresaFormModal = ({ open, onClose, empresa }: EmpresaFormModalProps) => {
  const { toast } = useToast();
  const createEmpresa = useCreateEmpresa();
  const updateEmpresa = useUpdateEmpresa();
  const isEditing = !!empresa;

  const [form, setForm] = useState(() =>
    empresa
      ? {
          nome: empresa.nome ?? '',
          cnpj: empresa.cnpj ?? '',
          razao_social: empresa.razao_social ?? '',
          segmento: empresa.segmento as 'Medicamentos' | 'Empreendimentos',
          uf: empresa.uf ?? '',
          municipio: empresa.municipio ?? '',
          endereco: empresa.endereco ?? '',
          telefone: empresa.telefone ?? '',
          email: empresa.email ?? '',
          cnae_codigo: empresa.cnae_codigo ?? '',
          cnae_descricao: empresa.cnae_descricao ?? '',
          sicaf_status: empresa.sicaf_status ?? 'Pendente',
          certidoes_validas: empresa.certidoes_validas ?? false,
        }
      : { ...EMPTY_FORM }
  );

  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // IA preencher via CNPJ público
  const handleCnpjLookup = async () => {
    const cnpj = form.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      toast({ title: 'CNPJ inválido', description: 'Informe os 14 dígitos do CNPJ.', variant: 'destructive' });
      return;
    }
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social ?? prev.razao_social,
        nome: data.nome_fantasia || data.razao_social || prev.nome,
        uf: data.uf ?? prev.uf,
        municipio: data.municipio ?? prev.municipio,
        endereco: [data.logradouro, data.numero, data.bairro].filter(Boolean).join(', '),
        email: data.email ?? prev.email,
        telefone: data.ddd_telefone_1 ?? prev.telefone,
        cnae_codigo: data.cnae_fiscal ? String(data.cnae_fiscal) : prev.cnae_codigo,
        cnae_descricao: data.cnae_fiscal_descricao ?? prev.cnae_descricao,
      }));
      toast({ title: '✅ Dados preenchidos via CNPJ', description: data.razao_social });
    } catch {
      toast({ title: 'Erro ao consultar CNPJ', description: 'Verifique o número e tente novamente.', variant: 'destructive' });
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nome || !form.cnpj || !form.uf || !form.municipio) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome, CNPJ, UF e município.', variant: 'destructive' });
      return;
    }

    if (isEditing && empresa) {
      await updateEmpresa.mutateAsync({ id: empresa.id, ...form });
    } else {
      await createEmpresa.mutateAsync(form as Omit<EmpresaInsert, 'user_id'>);
    }
    onClose();
  };

  const isPending = createEmpresa.isPending || updateEmpresa.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Empresa' : 'Cadastrar Empresa'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `Atualizando dados de ${empresa?.nome}` : 'Preencha os dados ou use o botão IA para autocompletar via CNPJ.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-2 pb-6">
            {/* CNPJ row com lookup */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label>CNPJ *</Label>
                <Input
                  value={form.cnpj}
                  onChange={e => set('cnpj', e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCnpjLookup}
                disabled={loadingCnpj}
                className="gap-2 shrink-0"
              >
                {loadingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
                IA Preencher
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome da empresa" />
              </div>
              <div className="space-y-1.5">
                <Label>Razão Social</Label>
                <Input value={form.razao_social} onChange={e => set('razao_social', e.target.value)} placeholder="Razão social" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Município *</Label>
                <Input value={form.municipio} onChange={e => set('municipio', e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-1.5">
                <Label>UF *</Label>
                <Input value={form.uf} onChange={e => set('uf', e.target.value.toUpperCase().slice(0, 2))} placeholder="PA" maxLength={2} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Logradouro, número, bairro" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CNAE (Código)</Label>
                <Input value={form.cnae_codigo} onChange={e => set('cnae_codigo', e.target.value)} placeholder="4771-7" />
              </div>
              <div className="space-y-1.5">
                <Label>CNAE (Descrição)</Label>
                <Input value={form.cnae_descricao} onChange={e => set('cnae_descricao', e.target.value)} placeholder="Comércio varejista..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <Select value={form.segmento} onValueChange={v => set('segmento', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                    <SelectItem value="Empreendimentos">Empreendimentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status SICAF</Label>
                <Select value={form.sicaf_status} onValueChange={v => set('sicaf_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <input
                type="checkbox"
                id="certidoes"
                checked={form.certidoes_validas}
                onChange={e => set('certidoes_validas', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <Label htmlFor="certidoes" className="cursor-pointer">Certidões válidas (fiscal, trabalhista, previdenciária)</Label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Empresa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Documentos Modal ────────────────────────────────────────────────────────
const DocumentosModal = ({ empresa, open, onClose }: { empresa: Empresa | null; open: boolean; onClose: () => void }) => {
  if (!empresa) return null;

  const docs = [
    { label: 'SICAF', status: empresa.sicaf_status === 'Regular' ? 'ok' : 'pendente', desc: empresa.sicaf_status ?? 'Não verificado' },
    { label: 'Certidões Fiscais', status: empresa.certidoes_validas ? 'ok' : 'vencida', desc: empresa.certidoes_validas ? 'Válidas' : 'Vencidas ou ausentes' },
    { label: 'Certidão FGTS', status: empresa.certidoes_validas ? 'ok' : 'pendente', desc: empresa.certidoes_validas ? 'Regular' : 'Verificar' },
    { label: 'Certidão Trabalhista (TST)', status: empresa.certidoes_validas ? 'ok' : 'pendente', desc: empresa.certidoes_validas ? 'Regular' : 'Verificar' },
    { label: 'CNAE Cadastrado', status: empresa.cnae_codigo ? 'ok' : 'pendente', desc: empresa.cnae_codigo ? `${empresa.cnae_codigo} — ${empresa.cnae_descricao || ''}` : 'Não cadastrado' },
    { label: 'Certificado Digital', status: empresa.certificado_digital_tipo ? 'ok' : 'pendente', desc: empresa.certificado_digital_tipo ? `${empresa.certificado_digital_tipo} — válido até ${empresa.certificado_digital_validade ? format(new Date(empresa.certificado_digital_validade), 'dd/MM/yyyy') : '?'}` : 'Não cadastrado' },
    { label: 'Gov.br Vinculado', status: empresa.govbr_vinculado ? 'ok' : 'pendente', desc: empresa.govbr_vinculado ? 'Vinculado' : 'Não vinculado' },
  ];

  const iconMap = { ok: <CheckCircle2 className="w-5 h-5 text-success" />, pendente: <AlertTriangle className="w-5 h-5 text-warning" />, vencida: <XCircle className="w-5 h-5 text-destructive" /> };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Documentos de Habilitação
          </DialogTitle>
          <DialogDescription>{empresa.nome} — {empresa.cnpj}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {docs.map((doc) => (
            <div key={doc.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {iconMap[doc.status as keyof typeof iconMap]}
                <div>
                  <p className="font-medium text-sm">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">{doc.desc}</p>
                </div>
              </div>
              <Badge variant={doc.status === 'ok' ? 'default' : doc.status === 'vencida' ? 'destructive' : 'secondary'} className="text-xs">
                {doc.status === 'ok' ? 'OK' : doc.status === 'vencida' ? 'Vencida' : 'Pendente'}
              </Badge>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const Empresas = () => {
  const { data: empresas = [], isLoading, refetch } = useEmpresas();
  const deleteEmpresa = useDeleteEmpresa();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Empresa | null>(null);
  const [docTarget, setDocTarget] = useState<Empresa | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [search, setSearch] = useState('');

  const filtered = empresas.filter(e =>
    !search ||
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj.includes(search) ||
    e.municipio.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (empresa: Empresa) => {
    setEditTarget(empresa);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleVerDocs = (empresa: Empresa) => {
    setDocTarget(empresa);
    setDocOpen(true);
  };

  const handleDelete = (empresa: Empresa) => setDeleteTarget(empresa);

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteEmpresa.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <MainLayout title="Empresas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar empresa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <Button
            className="gap-2 shrink-0"
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            Adicionar Empresa
          </Button>
        </div>

        {/* Stats row */}
        {empresas.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{empresas.length}</p>
                <p className="text-xs text-muted-foreground">Cadastradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-success">{empresas.filter(e => e.sicaf_status === 'Regular').length}</p>
                <p className="text-xs text-muted-foreground">SICAF Regular</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{empresas.filter(e => e.certidoes_validas).length}</p>
                <p className="text-xs text-muted-foreground">Certidões OK</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 && empresas.length === 0 ? (
          <EmptyState onAdd={() => setFormOpen(true)} />
        ) : (
          <div className="grid gap-4">
            {filtered.length === 0 && search ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma empresa encontrada para "{search}"</p>
              </div>
            ) : (
              filtered.map((empresa, index) => (
                <div
                  key={empresa.id}
                  className="glass-card p-6 animate-slide-up opacity-0"
                  style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg leading-tight">{empresa.nome}</h3>
                        {empresa.razao_social && empresa.razao_social !== empresa.nome && (
                          <p className="text-xs text-muted-foreground">{empresa.razao_social}</p>
                        )}
                        <p className="text-sm text-muted-foreground font-mono mt-0.5">{empresa.cnpj}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {empresa.municipio}/{empresa.uf}
                          </span>
                          {empresa.email && (
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" />
                              {empresa.email}
                            </span>
                          )}
                          {empresa.telefone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" />
                              {empresa.telefone}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Atualizado {format(new Date(empresa.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>

                        {empresa.cnae_codigo && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>CNAE {empresa.cnae_codigo}{empresa.cnae_descricao ? ` — ${empresa.cnae_descricao}` : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      <Badge variant={empresa.segmento === 'Medicamentos' ? 'portal' : 'modalidade'}>
                        {empresa.segmento}
                      </Badge>

                      <div className="flex flex-col gap-1 mt-1">
                        {empresa.sicaf_status === 'Regular' ? (
                          <span className="flex items-center gap-1.5 text-success text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> SICAF Regular
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-warning text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" /> SICAF {empresa.sicaf_status ?? 'Pendente'}
                          </span>
                        )}

                        {empresa.certidoes_validas ? (
                          <span className="flex items-center gap-1.5 text-success text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Certidões OK
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-destructive text-xs">
                            <XCircle className="w-3.5 h-3.5" /> Certidões Pendentes
                          </span>
                        )}

                        {empresa.cnae_codigo ? (
                          <span className="flex items-center gap-1.5 text-success text-xs">
                            <Award className="w-3.5 h-3.5" /> CNAE Cadastrado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-warning text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" /> CNAE Ausente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{empresa.endereco || 'Endereço não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleVerDocs(empresa)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Ver Documentos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleEdit(empresa)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(empresa)}
                        disabled={deleteEmpresa.isPending}
                      >
                        {deleteEmpresa.isPending && deleteTarget?.id === empresa.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <EmpresaFormModal
        open={formOpen}
        onClose={handleCloseForm}
        empresa={editTarget}
      />

      {/* Documentos Modal */}
      <DocumentosModal
        empresa={docTarget}
        open={docOpen}
        onClose={() => { setDocOpen(false); setDocTarget(null); }}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa <strong>{deleteTarget?.nome}</strong> será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Empresas;
