import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useEmpresas, useCreateEmpresa, useDeleteEmpresa, type Empresa } from '@/hooks/useEmpresas';
import { useAuth } from '@/contexts/AuthContext';
import { Constants } from '@/integrations/supabase/types';
import { EmpresaDetalhe } from '@/components/empresa/EmpresaDetalhe';
import { 
  Building2, Plus, CheckCircle2, AlertTriangle, XCircle, 
  Trash2, Shield, Key, Globe, FileCheck, MapPin, 
  Phone, Mail, Hash, Briefcase, Pill, AlertCircle,
  Loader2, Eye
} from 'lucide-react';
import { format } from 'date-fns';

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

interface EmpresaFormData {
  nome: string;
  razao_social: string;
  cnpj: string;
  segmento: 'Medicamentos' | 'Empreendimentos';
  uf: string;
  municipio: string;
  endereco: string;
  telefone: string;
  email: string;
  cnae_codigo: string;
  cnae_descricao: string;
  certificado_digital_tipo: string;
  certificado_digital_emissor: string;
  certificado_digital_validade: string;
  govbr_vinculado: boolean;
  sicaf_status: string;
  certidoes_validas: boolean;
  licenca_farmaceutica: boolean;
}

const EMPTY_FORM: EmpresaFormData = {
  nome: '', razao_social: '', cnpj: '', segmento: 'Empreendimentos',
  uf: '', municipio: '', endereco: '', telefone: '', email: '',
  cnae_codigo: '', cnae_descricao: '', certificado_digital_tipo: '',
  certificado_digital_emissor: '', certificado_digital_validade: '',
  govbr_vinculado: false, sicaf_status: 'Pendente', certidoes_validas: false,
  licenca_farmaceutica: false,
};

const Empresas = () => {
  const { user } = useAuth();
  const { data: empresas, isLoading } = useEmpresas();
  const createEmpresa = useCreateEmpresa();
  const deleteEmpresa = useDeleteEmpresa();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EmpresaFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('todos');
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  // Auto-open create dialog when navigated with ?action=criar
  useEffect(() => {
    if (searchParams.get('action') === 'criar') {
      setFormData(EMPTY_FORM);
      setIsDialogOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openNew = () => {
    setFormData(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.cnpj || !formData.uf || !formData.municipio) return;
    const payload = {
      ...formData,
      certificado_digital_validade: formData.certificado_digital_validade 
        ? new Date(formData.certificado_digital_validade).toISOString() : null,
    };
    const result = await createEmpresa.mutateAsync(payload);
    setIsDialogOpen(false);
    // Open detail view of newly created empresa
    if (result) setSelectedEmpresa(result);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteEmpresa.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
    if (selectedEmpresa?.id === deleteConfirmId) setSelectedEmpresa(null);
  };

  const filteredEmpresas = empresas?.filter(e => {
    if (activeTab === 'todos') return true;
    if (activeTab === 'medicamentos') return e.segmento === 'Medicamentos';
    if (activeTab === 'empreendimentos') return e.segmento === 'Empreendimentos';
    return true;
  }) || [];

  const certValidade = (val: string | null) => {
    if (!val) return null;
    const d = new Date(val);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'expired';
    if (diff < 15) return 'expiring';
    return 'valid';
  };

  // ====== DETAIL VIEW ======
  if (selectedEmpresa) {
    // Refresh empresa data from the list
    const freshEmpresa = empresas?.find(e => e.id === selectedEmpresa.id) || selectedEmpresa;
    return (
      <MainLayout title="Detalhes da Empresa">
        <EmpresaDetalhe empresa={freshEmpresa} onBack={() => setSelectedEmpresa(null)} />
      </MainLayout>
    );
  }

  // ====== LIST VIEW ======
  return (
    <MainLayout title="Cadastro de Empresas">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Cadastre as empresas que participarão de licitações. Clique numa empresa para ver todos os detalhes.
          </p>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todos" className="gap-1.5"><Building2 className="w-4 h-4" /> Todas</TabsTrigger>
            <TabsTrigger value="medicamentos" className="gap-1.5"><Pill className="w-4 h-4" /> Medicamentos</TabsTrigger>
            <TabsTrigger value="empreendimentos" className="gap-1.5"><Briefcase className="w-4 h-4" /> Empreendimentos</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && filteredEmpresas.length === 0 && (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma empresa cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Empresa" para começar.</p>
          </div>
        )}

        <div className="grid gap-4">
          {filteredEmpresas.map((empresa) => {
            const certStatus = certValidade(empresa.certificado_digital_validade);
            return (
              <div
                key={empresa.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => setSelectedEmpresa(empresa)}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                      {empresa.segmento === 'Medicamentos'
                        ? <Pill className="w-6 h-6 text-primary" />
                        : <Briefcase className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                        {empresa.nome}
                      </h3>
                      {empresa.razao_social && (
                        <p className="text-xs text-muted-foreground truncate">{empresa.razao_social}</p>
                      )}
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">{empresa.cnpj}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{empresa.municipio}/{empresa.uf}</span>
                        {empresa.cnae_codigo && (
                          <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />CNAE {empresa.cnae_codigo}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-col items-start gap-2 shrink-0">
                    <Badge variant={empresa.segmento === 'Medicamentos' ? 'secondary' : 'outline'}>
                      {empresa.segmento}
                    </Badge>
                    <div className={`flex items-center gap-1.5 text-xs ${empresa.govbr_vinculado ? 'text-success' : 'text-muted-foreground'}`}>
                      <Globe className="w-3.5 h-3.5" />Gov.br {empresa.govbr_vinculado ? '✓' : '—'}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${empresa.sicaf_status === 'Regular' ? 'text-success' : empresa.sicaf_status === 'Irregular' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      <Shield className="w-3.5 h-3.5" />SICAF {empresa.sicaf_status || 'Pendente'}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${
                      certStatus === 'valid' ? 'text-success' : certStatus === 'expiring' ? 'text-warning animate-pulse' : certStatus === 'expired' ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      <Key className="w-3.5 h-3.5" />
                      {empresa.certificado_digital_tipo ? `Cert. ${empresa.certificado_digital_tipo}` : 'Certificado —'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Clique para ver detalhes completos
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(empresa.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação é irreversível. Todos os dados de compliance e propostas vinculadas serão perdidos.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteEmpresa.isPending}>
              {deleteEmpresa.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Form Dialog — simplified, just basic info to start */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Cadastrar Nova Empresa
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Informe os dados básicos. Após o cadastro, use o botão "IA Preencher" para completar automaticamente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2">
              <Label>Nome Fantasia *</Label>
              <Input value={formData.nome} onChange={e => setFormData(p => ({...p, nome: e.target.value}))} placeholder="Nome da empresa" />
            </div>
            <div>
              <Label>CNPJ *</Label>
              <Input value={formData.cnpj} onChange={e => setFormData(p => ({...p, cnpj: e.target.value}))} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <Label>Segmento *</Label>
              <Select value={formData.segmento} onValueChange={v => setFormData(p => ({...p, segmento: v as any}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.segmento_type.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>UF *</Label>
              <Select value={formData.uf} onValueChange={v => setFormData(p => ({...p, uf: v}))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Município *</Label>
              <Input value={formData.municipio} onChange={e => setFormData(p => ({...p, municipio: e.target.value}))} placeholder="Cidade" />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={createEmpresa.isPending || !formData.nome || !formData.cnpj || !formData.uf || !formData.municipio}
              className="gap-1.5"
            >
              {createEmpresa.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Cadastrar & Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Empresas;
