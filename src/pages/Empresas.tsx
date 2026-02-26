import { useState, useRef, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
  KeyRound,
  Globe,
  Link2,
  BadgeCheck,
  Clock,
  Upload,
} from 'lucide-react';
import { useEmpresas, useCreateEmpresa, useUpdateEmpresa, useDeleteEmpresa } from '@/hooks/useEmpresas';
import type { Empresa, EmpresaInsert } from '@/hooks/useEmpresas';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CertificadoA1Upload } from '@/components/certificado/CertificadoA1Upload';

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

// ─── Papel Timbrado Upload ───────────────────────────────────────────────────
const PapelTimbradoUpload = ({ empresa }: { empresa: Empresa | null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateEmpresa = useUpdateEmpresa();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const currentUrl = (empresa as any)?.papel_timbrado_url ?? null;

  // Load signed URL for existing letterhead
  useEffect(() => {
    if (currentUrl && !previewUrl) {
      supabase.storage
        .from('papeis-timbrados')
        .createSignedUrl(currentUrl, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) setPreviewUrl(data.signedUrl);
        });
    }
  }, [currentUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !empresa) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é 10MB.', variant: 'destructive' });
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Envie PNG, JPG, WEBP ou PDF.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${empresa.id}/papel-timbrado.${ext}`;

      // Delete old file if exists
      if (currentUrl) {
        await supabase.storage.from('papeis-timbrados').remove([currentUrl]);
      }

      const { error: uploadError } = await supabase.storage
        .from('papeis-timbrados')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the file path (bucket is private, we'll use signed URLs for preview)
      await updateEmpresa.mutateAsync({
        id: empresa.id,
        papel_timbrado_url: filePath,
      } as any);

      // Get signed URL for immediate preview
      const { data: signedData } = await supabase.storage
        .from('papeis-timbrados')
        .createSignedUrl(filePath, 3600);
      setPreviewUrl(signedData?.signedUrl ?? null);
      toast({ title: 'Papel timbrado enviado', description: 'Arquivo salvo com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err?.message || 'Falha ao enviar arquivo.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!empresa || !currentUrl) return;
    setUploading(true);
    try {
      if (currentUrl) {
        await supabase.storage.from('papeis-timbrados').remove([currentUrl]);
      }
      await updateEmpresa.mutateAsync({ id: empresa.id, papel_timbrado_url: null } as any);
      setPreviewUrl(null);
      toast({ title: 'Papel timbrado removido' });
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err?.message || 'Falha.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const hasLetterhead = !!currentUrl || !!previewUrl;
  const displayUrl = previewUrl; // Always use signed URL for display
  const isPdf = currentUrl?.toLowerCase().endsWith('.pdf') || previewUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-5 py-4 pb-6">
      {/* Info box */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-primary mb-1">Papel Timbrado da Empresa</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Envie o modelo de papel timbrado da empresa (PNG, JPG, WEBP ou PDF, até 10MB). 
              Este arquivo será usado como base para gerar propostas e contratos com a identidade visual da empresa.
            </p>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        onChange={handleUpload}
        className="hidden"
      />

      {hasLetterhead ? (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <p className="font-semibold text-sm text-success">Papel timbrado cadastrado</p>
            </div>
            {isPdf ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Arquivo PDF</p>
                  <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    Visualizar PDF →
                  </a>
                </div>
              </div>
            ) : (
              <img
                src={displayUrl}
                alt="Papel timbrado"
                className="max-h-64 w-full object-contain rounded-lg border border-border bg-background"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Substituir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !empresa}
          className="w-full p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-all flex flex-col items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="font-semibold text-sm">{uploading ? 'Enviando...' : 'Clique para enviar o papel timbrado'}</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP ou PDF — até 10MB</p>
          </div>
        </button>
      )}

      {!empresa && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
          <p className="text-xs text-warning">
            <strong>⚠️</strong> Salve a empresa primeiro para poder enviar o papel timbrado.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Empresa Form Modal ──────────────────────────────────────────────────────
interface EmpresaFormModalProps {
  open: boolean;
  onClose: () => void;
  empresa?: Empresa | null;
}

// Index signature makes it compatible with Supabase Json type
type CnaeSecundario = { [key: string]: string; codigo: string; descricao: string };

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
  cnaes_secundarios: [] as CnaeSecundario[],
  sicaf_status: 'Pendente',
  certidoes_validas: false,
  // Certificado Digital
  certificado_digital_tipo: '',
  certificado_digital_validade: '',
  certificado_digital_emissor: '',
  // Gov.br
  govbr_vinculado: false,
  // E-mail SMTP/POP
  email_smtp_host: '',
  email_smtp_port: '587',
  email_smtp_user: '',
  email_smtp_password: '',
  email_smtp_ssl: true,
  email_pop_host: '',
  email_pop_port: '995',
  email_pop_user: '',
  email_pop_password: '',
  email_pop_ssl: true,
};

const EmpresaFormModal = ({ open, onClose, empresa }: EmpresaFormModalProps) => {
  const { toast } = useToast();
  const createEmpresa = useCreateEmpresa();
  const updateEmpresa = useUpdateEmpresa();
  const isEditing = !!empresa;

  const buildForm = (e: Empresa | null | undefined) =>
    e
      ? {
          nome: e.nome ?? '',
          cnpj: e.cnpj ?? '',
          razao_social: e.razao_social ?? '',
          segmento: e.segmento as 'Medicamentos' | 'Empreendimentos',
          uf: e.uf ?? '',
          municipio: e.municipio ?? '',
          endereco: e.endereco ?? '',
          telefone: e.telefone ?? '',
          email: e.email ?? '',
          cnae_codigo: e.cnae_codigo ?? '',
          cnae_descricao: e.cnae_descricao ?? '',
          cnaes_secundarios: (e.cnaes_secundarios as unknown as CnaeSecundario[]) ?? [],
          sicaf_status: e.sicaf_status ?? 'Pendente',
          certidoes_validas: e.certidoes_validas ?? false,
          certificado_digital_tipo: e.certificado_digital_tipo ?? '',
          certificado_digital_validade: e.certificado_digital_validade
            ? e.certificado_digital_validade.split('T')[0]
            : '',
          certificado_digital_emissor: e.certificado_digital_emissor ?? '',
          govbr_vinculado: e.govbr_vinculado ?? false,
          email_smtp_host: (e as any).email_smtp_host ?? '',
          email_smtp_port: String((e as any).email_smtp_port ?? 587),
          email_smtp_user: (e as any).email_smtp_user ?? '',
          email_smtp_password: (e as any).email_smtp_password ?? '',
          email_smtp_ssl: (e as any).email_smtp_ssl ?? true,
          email_pop_host: (e as any).email_pop_host ?? '',
          email_pop_port: String((e as any).email_pop_port ?? 995),
          email_pop_user: (e as any).email_pop_user ?? '',
          email_pop_password: (e as any).email_pop_password ?? '',
          email_pop_ssl: (e as any).email_pop_ssl ?? true,
        }
      : { ...EMPTY_FORM };

  const [form, setForm] = useState(() => buildForm(empresa));

  // Sync form when empresa prop changes (e.g. opening edit for a different company)
  useEffect(() => {
    setForm(buildForm(empresa));
  }, [empresa]);

  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // IA preencher via CNPJ público — busca CNAE primário E secundários
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

      // Extrair CNAEs secundários da resposta da BrasilAPI
      const secundarios: CnaeSecundario[] = (data.cnaes_secundarios ?? []).map((c: { codigo: number; descricao: string }) => ({
        codigo: String(c.codigo),
        descricao: c.descricao ?? '',
      }));

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
        cnaes_secundarios: secundarios,
      }));
      toast({
        title: '✅ Dados preenchidos via CNPJ',
        description: `${data.razao_social} — ${1 + secundarios.length} CNAE(s) encontrado(s)`,
      });
    } catch {
      toast({ title: 'Erro ao consultar CNPJ', description: 'Verifique o número e tente novamente.', variant: 'destructive' });
    } finally {
      setLoadingCnpj(false);
    }
  };

  // Check certificate expiry
  const getCertStatus = () => {
    if (!form.certificado_digital_tipo) return 'none';
    if (!form.certificado_digital_validade) return 'no_date';
    const expiry = new Date(form.certificado_digital_validade);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'expiring';
    return 'valid';
  };

  const certStatus = getCertStatus();

  const handleSubmit = async () => {
    if (!form.nome || !form.cnpj || !form.uf || !form.municipio) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome, CNPJ, UF e município.', variant: 'destructive' });
      return;
    }

    const payload = {
      ...form,
      // Cast cnaes_secundarios to Json-compatible type for Supabase
      cnaes_secundarios: form.cnaes_secundarios as unknown as import('@/integrations/supabase/types').Json,
      certificado_digital_validade: form.certificado_digital_validade
        ? new Date(form.certificado_digital_validade + 'T12:00:00').toISOString()
        : null,
      email_smtp_port: form.email_smtp_port ? parseInt(form.email_smtp_port, 10) : 587,
      email_pop_port: form.email_pop_port ? parseInt(form.email_pop_port, 10) : 995,
    };

    if (isEditing && empresa) {
      await updateEmpresa.mutateAsync({ id: empresa.id, ...payload } as any);
    } else {
      await createEmpresa.mutateAsync(payload as unknown as Omit<EmpresaInsert, 'user_id'>);
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

        <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
           <TabsList className="mx-6 mt-2 shrink-0 grid grid-cols-5 w-auto">
            <TabsTrigger value="dados" className="gap-1 text-xs">
              <Building2 className="w-3.5 h-3.5" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="certificado" className="gap-1 text-xs">
              <KeyRound className="w-3.5 h-3.5" />
              Certificado
              {form.certificado_digital_tipo && certStatus !== 'valid' && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-warning inline-block" />
              )}
            </TabsTrigger>
            <TabsTrigger value="email_config" className="gap-1 text-xs">
              <Mail className="w-3.5 h-3.5" />
              E-mail
              {form.email_smtp_host && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-success inline-block" />
              )}
            </TabsTrigger>
            <TabsTrigger value="govbr" className="gap-1 text-xs">
              <Globe className="w-3.5 h-3.5" />
              Gov.br
              {form.govbr_vinculado && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-success inline-block" />
              )}
            </TabsTrigger>
            <TabsTrigger value="timbrado" className="gap-1 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Timbrado
              {empresa?.papel_timbrado_url && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-success inline-block" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Aba: Dados da Empresa ── */}
          <TabsContent value="dados" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6">
              <div className="space-y-5 py-4 pb-6">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label>CNPJ *</Label>
                    <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
                  </div>
                  <Button type="button" variant="outline" onClick={handleCnpjLookup} disabled={loadingCnpj} className="gap-2 shrink-0">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      CNAE Primário *
                    </Label>
                    {form.cnaes_secundarios.length > 0 && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        +{form.cnaes_secundarios.length} CNAEs secundários importados
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input value={form.cnae_codigo} onChange={e => set('cnae_codigo', e.target.value)} placeholder="4771-7 (código)" />
                    <Input value={form.cnae_descricao} onChange={e => set('cnae_descricao', e.target.value)} placeholder="Descrição do CNAE" />
                  </div>
                </div>

                {/* CNAEs Secundários — exibição */}
                {form.cnaes_secundarios.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      CNAEs Secundários ({form.cnaes_secundarios.length})
                      <span className="ml-1 text-primary">— usados na verificação de habilitação</span>
                    </Label>
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      {form.cnaes_secundarios.slice(0, 8).map((c, i) => (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                          <span className="font-mono font-semibold text-primary w-16 shrink-0">{c.codigo}</span>
                          <span className="text-muted-foreground truncate">{c.descricao}</span>
                        </div>
                      ))}
                      {form.cnaes_secundarios.length > 8 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20">
                          + {form.cnaes_secundarios.length - 8} outros CNAEs secundários
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CNAEs secundários são importados automaticamente via "IA Preencher" e usados para validar participação em licitações.
                    </p>
                  </div>
                )}

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
          </TabsContent>

          {/* ── Aba: Certificado Digital ── */}
          <TabsContent value="certificado" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6">
              <div className="space-y-5 py-4 pb-6">
                {/* Status banner */}
                {form.certificado_digital_tipo && (
                  <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                    certStatus === 'valid' ? 'bg-success/10 border-success/30 text-success' :
                    certStatus === 'expiring' ? 'bg-warning/10 border-warning/30 text-warning' :
                    certStatus === 'expired' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                    'bg-muted border-border text-muted-foreground'
                  }`}>
                    {certStatus === 'valid' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                    {certStatus === 'expiring' && <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />}
                    {certStatus === 'expired' && <XCircle className="w-5 h-5 shrink-0" />}
                    {certStatus === 'no_date' && <Clock className="w-5 h-5 shrink-0" />}
                    <div>
                      <p className="font-semibold text-sm">
                        {certStatus === 'valid' && 'Certificado Digital ativo e válido'}
                        {certStatus === 'expiring' && 'Certificado vencendo em breve — renove agora!'}
                        {certStatus === 'expired' && 'Certificado VENCIDO — necessita renovação urgente'}
                        {certStatus === 'no_date' && 'Informe a data de validade do certificado'}
                      </p>
                      {form.certificado_digital_validade && (
                        <p className="text-xs opacity-80">Validade: {format(new Date(form.certificado_digital_validade + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Info box */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <KeyRound className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-primary mb-1">O que é o Certificado Digital?</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        O Certificado Digital ICP-Brasil (tipo A1 ou A3) é obrigatório para assinar documentos eletrônicos, 
                        acessar sistemas governamentais e participar de licitações eletrônicas. 
                        O <strong>A1</strong> fica instalado no computador e o <strong>A3</strong> em token físico ou cartão.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                    Tipo do Certificado
                  </Label>
                  <Select value={form.certificado_digital_tipo} onValueChange={v => set('certificado_digital_tipo', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">A1 — Arquivo Digital</span>
                          <span className="text-xs text-muted-foreground">Instalado no computador, validade 1 ano</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="A3">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">A3 — Token / Cartão</span>
                          <span className="text-xs text-muted-foreground">Dispositivo físico, validade até 3 anos</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="A1 e-CNPJ">A1 e-CNPJ</SelectItem>
                      <SelectItem value="A3 e-CNPJ">A3 e-CNPJ</SelectItem>
                      <SelectItem value="NF-e">NF-e (Nota Fiscal Eletrônica)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Data de Validade
                    </Label>
                    <Input
                      type="date"
                      value={form.certificado_digital_validade}
                      onChange={e => set('certificado_digital_validade', e.target.value)}
                    />
                    {form.certificado_digital_validade && (() => {
                      const expiry = new Date(form.certificado_digital_validade + 'T12:00:00');
                      const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <p className={`text-xs ${daysLeft < 0 ? 'text-destructive' : daysLeft <= 30 ? 'text-warning' : 'text-success'}`}>
                          {daysLeft < 0 ? `Vencido há ${Math.abs(daysLeft)} dias` : `${daysLeft} dias restantes`}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      Autoridade Certificadora (Emissor)
                    </Label>
                    <Select value={form.certificado_digital_emissor} onValueChange={v => set('certificado_digital_emissor', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o emissor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Serasa Experian">Serasa Experian</SelectItem>
                        <SelectItem value="Certisign">Certisign</SelectItem>
                        <SelectItem value="Valid Certificadora">Valid Certificadora</SelectItem>
                        <SelectItem value="Soluti">Soluti</SelectItem>
                        <SelectItem value="Safeweb">Safeweb</SelectItem>
                        <SelectItem value="AC Certisign RFB">AC Certisign RFB</SelectItem>
                        <SelectItem value="SERPRO">SERPRO</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.certificado_digital_emissor === 'Outro' && (
                  <div className="space-y-1.5">
                    <Label>Informe o emissor</Label>
                    <Input
                      placeholder="Nome da autoridade certificadora"
                      onChange={e => set('certificado_digital_emissor', e.target.value)}
                    />
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>💡 Dica:</strong> Para participar de licitações no ComprasNet (PNCP) e outros portais federais, 
                    é obrigatório o certificado e-CNPJ. Certifique-se que o certificado está instalado e válido no 
                    computador que será usado para enviar propostas.
                  </p>
                </div>

                <Separator />

                {/* Upload do Certificado A1 para automação */}
                {empresa && (
                  <CertificadoA1Upload
                    empresaId={empresa.id}
                    empresaNome={empresa.nome}
                    certificadoTipo={form.certificado_digital_tipo}
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Aba: E-mail (SMTP/POP) ── */}
          <TabsContent value="email_config" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6">
              <div className="space-y-5 py-4 pb-6">
                {/* Info box */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-primary mb-1">Configuração de E-mail para Propostas</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Configure o servidor SMTP para <strong>envio</strong> de propostas por e-mail e o POP3 para 
                        <strong> recebimento</strong> de confirmações e respostas dos órgãos licitantes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preencher automaticamente:</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        email_smtp_host: 'smtp.gmail.com',
                        email_smtp_port: '587',
                        email_smtp_ssl: true,
                        email_pop_host: 'pop.gmail.com',
                        email_pop_port: '995',
                        email_pop_ssl: true,
                      }))}
                    >
                      <Mail className="w-3.5 h-3.5 text-red-500" />
                      Gmail
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        email_smtp_host: 'smtp.office365.com',
                        email_smtp_port: '587',
                        email_smtp_ssl: true,
                        email_pop_host: 'outlook.office365.com',
                        email_pop_port: '995',
                        email_pop_ssl: true,
                      }))}
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      Outlook / Microsoft 365
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        email_smtp_host: 'smtp.yahoo.com',
                        email_smtp_port: '587',
                        email_smtp_ssl: true,
                        email_pop_host: 'pop.mail.yahoo.com',
                        email_pop_port: '995',
                        email_pop_ssl: true,
                      }))}
                    >
                      <Mail className="w-3.5 h-3.5 text-purple-500" />
                      Yahoo
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* SMTP Section */}
                <div className="space-y-4">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    SMTP — Envio de E-mails
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Servidor SMTP</Label>
                      <Input value={form.email_smtp_host} onChange={e => set('email_smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Porta</Label>
                      <Input value={form.email_smtp_port} onChange={e => set('email_smtp_port', e.target.value)} placeholder="587" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Usuário / Login</Label>
                      <Input value={form.email_smtp_user} onChange={e => set('email_smtp_user', e.target.value)} placeholder="empresa@dominio.com.br" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Senha</Label>
                      <Input type="password" value={form.email_smtp_password} onChange={e => set('email_smtp_password', e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Switch checked={form.email_smtp_ssl} onCheckedChange={v => set('email_smtp_ssl', v)} />
                    <Label className="cursor-pointer">Usar SSL/TLS</Label>
                  </div>
                </div>

                <Separator />

                {/* POP Section */}
                <div className="space-y-4">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    POP3 — Recebimento de E-mails
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Servidor POP3</Label>
                      <Input value={form.email_pop_host} onChange={e => set('email_pop_host', e.target.value)} placeholder="pop.gmail.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Porta</Label>
                      <Input value={form.email_pop_port} onChange={e => set('email_pop_port', e.target.value)} placeholder="995" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Usuário / Login</Label>
                      <Input value={form.email_pop_user} onChange={e => set('email_pop_user', e.target.value)} placeholder="empresa@dominio.com.br" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Senha</Label>
                      <Input type="password" value={form.email_pop_password} onChange={e => set('email_pop_password', e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Switch checked={form.email_pop_ssl} onCheckedChange={v => set('email_pop_ssl', v)} />
                    <Label className="cursor-pointer">Usar SSL/TLS</Label>
                  </div>
                </div>

                {/* Tips */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>💡 Dica:</strong> Para Gmail, use <strong>smtp.gmail.com:587</strong> (SMTP) e <strong>pop.gmail.com:995</strong> (POP3). 
                    Ative o acesso de "apps menos seguros" ou crie uma <strong>senha de app</strong> nas configurações de segurança do Google.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Aba: Gov.br ── */}
          <TabsContent value="govbr" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6">
              <div className="space-y-5 py-4 pb-6">
                {/* Status banner */}
                <div className={`p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
                  form.govbr_vinculado
                    ? 'bg-success/10 border-success/40'
                    : 'bg-muted border-dashed border-border'
                }`}>
                  <div className={`p-3 rounded-full ${form.govbr_vinculado ? 'bg-success/20' : 'bg-muted'}`}>
                    <Globe className={`w-7 h-7 ${form.govbr_vinculado ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-base ${form.govbr_vinculado ? 'text-success' : 'text-foreground'}`}>
                      {form.govbr_vinculado ? '✅ Gov.br Vinculado' : 'Gov.br não vinculado'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {form.govbr_vinculado
                        ? 'A empresa possui acesso ao portal Gov.br para participação em licitações federais.'
                        : 'Vincule o acesso Gov.br para participar de licitações em portais federais.'}
                    </p>
                  </div>
                  <Switch
                    checked={form.govbr_vinculado}
                    onCheckedChange={v => set('govbr_vinculado', v)}
                  />
                </div>

                {/* Info box */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-primary mb-2">O que é o Gov.br?</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        O <strong>Gov.br</strong> é o portal único do Governo Federal Brasileiro. 
                        Para empresas, o acesso Gov.br com <strong>nível de confiabilidade Ouro ou Prata</strong> é 
                        necessário para acessar sistemas como o SICAF, ComprasNet e outros portais de compras públicas.
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-foreground">Passos para vincular:</p>
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Acesse <strong>gov.br/empresas</strong> com seu CPF ou CNPJ</li>
                          <li>Autentique-se com certificado digital ou banco credenciado</li>
                          <li>Cadastre a empresa no portal e eleve o nível de confiabilidade</li>
                          <li>Solicite acesso ao SICAF via Gov.br</li>
                          <li>Marque a empresa como vinculada neste sistema</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick access links */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Acesso Rápido aos Portais</p>
                  {[
                    { label: 'Portal Gov.br — Empresas', url: 'https://www.gov.br/empresas-e-negocios', icon: Globe },
                    { label: 'SICAF — Cadastro Fornecedores', url: 'https://www.gov.br/compras/pt-br/sistemas/sicaf', icon: ShieldCheck },
                    { label: 'ComprasNet — Portal Federal', url: 'https://www.comprasnet.gov.br', icon: BadgeCheck },
                    { label: 'PNCP — Portal Nacional', url: 'https://www.pncp.gov.br', icon: Link2 },
                  ].map(link => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all group"
                    >
                      <link.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm group-hover:text-primary transition-colors">{link.label}</span>
                      <Upload className="w-3.5 h-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rotate-45" />
                    </a>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <p className="text-xs text-warning leading-relaxed">
                    <strong>⚠️ Importante:</strong> Marcar como "vinculado" aqui é apenas um registro informativo no sistema. 
                    O vínculo real deve ser feito diretamente no portal Gov.br usando o CNPJ da empresa.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Aba: Papel Timbrado ── */}
          <TabsContent value="timbrado" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6">
              <PapelTimbradoUpload empresa={empresa ?? null} />
            </ScrollArea>
          </TabsContent>
        </Tabs>

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

  const cnaesSecundarios = (empresa.cnaes_secundarios as unknown as CnaeSecundario[]) ?? [];
  const totalCnaes = (empresa.cnae_codigo ? 1 : 0) + cnaesSecundarios.length;

  const docs = [
    { label: 'SICAF', status: empresa.sicaf_status === 'Regular' ? 'ok' : 'pendente', desc: empresa.sicaf_status ?? 'Não verificado' },
    { label: 'Certidões Fiscais', status: empresa.certidoes_validas ? 'ok' : 'vencida', desc: empresa.certidoes_validas ? 'Válidas' : 'Vencidas ou ausentes' },
    { label: 'Certidão FGTS', status: empresa.certidoes_validas ? 'ok' : 'pendente', desc: empresa.certidoes_validas ? 'Regular' : 'Verificar' },
    { label: 'Certidão Trabalhista (TST)', status: empresa.certidoes_validas ? 'ok' : 'pendente', desc: empresa.certidoes_validas ? 'Regular' : 'Verificar' },
    {
      label: `CNAE Cadastrado (${totalCnaes} total)`,
      status: empresa.cnae_codigo ? 'ok' : 'pendente',
      desc: empresa.cnae_codigo
        ? `Primário: ${empresa.cnae_codigo} — ${empresa.cnae_descricao || ''}${cnaesSecundarios.length > 0 ? ` + ${cnaesSecundarios.length} secundário(s)` : ''}`
        : 'Não cadastrado',
    },
    { label: 'Certificado Digital', status: empresa.certificado_digital_tipo ? 'ok' : 'pendente', desc: empresa.certificado_digital_tipo ? `${empresa.certificado_digital_tipo} — válido até ${empresa.certificado_digital_validade ? format(new Date(empresa.certificado_digital_validade), 'dd/MM/yyyy') : '?'}` : 'Não cadastrado' },
    { label: 'Gov.br Vinculado', status: empresa.govbr_vinculado ? 'ok' : 'pendente', desc: empresa.govbr_vinculado ? 'Vinculado' : 'Não vinculado' },
  ];

  const iconMap = { ok: <CheckCircle2 className="w-5 h-5 text-success" />, pendente: <AlertTriangle className="w-5 h-5 text-warning" />, vencida: <XCircle className="w-5 h-5 text-destructive" /> };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Lista todos os CNAEs secundários */}
          {cnaesSecundarios.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                CNAEs Secundários ({cnaesSecundarios.length}) — todos válidos para habilitação
              </p>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                {cnaesSecundarios.map((c, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="font-mono font-semibold text-primary w-16 shrink-0">{c.codigo}</span>
                    <span className="text-muted-foreground">{c.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
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

                        {(() => {
                          const sec = (empresa.cnaes_secundarios as unknown as CnaeSecundario[]) ?? [];
                          const total = (empresa.cnae_codigo ? 1 : 0) + sec.length;
                          return empresa.cnae_codigo ? (
                            <span className="flex items-center gap-1.5 text-success text-xs">
                              <Award className="w-3.5 h-3.5" /> {total} CNAE{total > 1 ? 's' : ''} cadastrado{total > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-warning text-xs">
                              <AlertTriangle className="w-3.5 h-3.5" /> CNAE Ausente
                            </span>
                          );
                        })()}

                        {empresa.certificado_digital_tipo ? (() => {
                          const expiry = empresa.certificado_digital_validade ? new Date(empresa.certificado_digital_validade) : null;
                          const daysLeft = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                          const isExpired = daysLeft !== null && daysLeft < 0;
                          const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                          return (
                            <span className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-destructive' : isExpiring ? 'text-warning' : 'text-success'}`}>
                              <KeyRound className={`w-3.5 h-3.5 ${isExpiring ? 'animate-pulse' : ''}`} />
                              Cert. {empresa.certificado_digital_tipo}
                              {isExpired ? ' (Vencido)' : isExpiring ? ` (${daysLeft}d)` : ' ✓'}
                            </span>
                          );
                        })() : (
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <KeyRound className="w-3.5 h-3.5" /> Sem Certificado Digital
                          </span>
                        )}

                        {empresa.govbr_vinculado ? (
                          <span className="flex items-center gap-1.5 text-success text-xs">
                            <Globe className="w-3.5 h-3.5" /> Gov.br Vinculado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Globe className="w-3.5 h-3.5" /> Gov.br Pendente
                          </span>
                        )}

                        {(empresa as any).papel_timbrado_url ? (
                          <span className="flex items-center gap-1.5 text-success text-xs">
                            <FileText className="w-3.5 h-3.5" /> Timbrado ✓
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-warning text-xs">
                            <FileText className="w-3.5 h-3.5" /> Sem Timbrado
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
