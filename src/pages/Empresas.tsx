import { useState } from 'react';
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
import { useEmpresas, useCreateEmpresa, useUpdateEmpresa, useDeleteEmpresa, type Empresa } from '@/hooks/useEmpresas';
import { useAuth } from '@/contexts/AuthContext';
import { Constants } from '@/integrations/supabase/types';
import { 
  Building2, Plus, CheckCircle2, AlertTriangle, XCircle, 
  Edit, Trash2, Shield, Key, Globe, FileCheck, MapPin, 
  Phone, Mail, Hash, Calendar, Briefcase, Pill, AlertCircle,
  Loader2
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
  const updateEmpresa = useUpdateEmpresa();
  const deleteEmpresa = useDeleteEmpresa();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmpresaFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('todos');

  const openNew = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEdit = (empresa: Empresa) => {
    setEditingId(empresa.id);
    setFormData({
      nome: empresa.nome || '',
      razao_social: empresa.razao_social || '',
      cnpj: empresa.cnpj || '',
      segmento: empresa.segmento as 'Medicamentos' | 'Empreendimentos',
      uf: empresa.uf || '',
      municipio: empresa.municipio || '',
      endereco: empresa.endereco || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      cnae_codigo: empresa.cnae_codigo || '',
      cnae_descricao: empresa.cnae_descricao || '',
      certificado_digital_tipo: empresa.certificado_digital_tipo || '',
      certificado_digital_emissor: empresa.certificado_digital_emissor || '',
      certificado_digital_validade: empresa.certificado_digital_validade 
        ? format(new Date(empresa.certificado_digital_validade), 'yyyy-MM-dd') : '',
      govbr_vinculado: empresa.govbr_vinculado || false,
      sicaf_status: empresa.sicaf_status || 'Pendente',
      certidoes_validas: empresa.certidoes_validas || false,
      licenca_farmaceutica: empresa.licenca_farmaceutica || false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.cnpj || !formData.uf || !formData.municipio) return;

    const payload = {
      ...formData,
      certificado_digital_validade: formData.certificado_digital_validade 
        ? new Date(formData.certificado_digital_validade).toISOString() : null,
    };

    if (editingId) {
      await updateEmpresa.mutateAsync({ id: editingId, ...payload });
    } else {
      await createEmpresa.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteEmpresa.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const filteredEmpresas = empresas?.filter(e => {
    if (activeTab === 'todos') return true;
    if (activeTab === 'medicamentos') return e.segmento === 'Medicamentos';
    if (activeTab === 'empreendimentos') return e.segmento === 'Empreendimentos';
    return true;
  }) || [];

  const getStatusColor = (status: string | null) => {
    if (status === 'Regular' || status === 'Ativo') return 'text-success';
    if (status === 'Pendente') return 'text-warning';
    return 'text-destructive';
  };

  const certValidade = (val: string | null) => {
    if (!val) return null;
    const d = new Date(val);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'expired';
    if (diff < 15) return 'expiring';
    return 'valid';
  };

  return (
    <MainLayout title="Cadastro de Empresas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Cadastre as empresas que participarão de licitações. Dados completos são exigidos pela Lei 14.133/2021.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        </div>

        {/* Segment tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todos" className="gap-1.5">
              <Building2 className="w-4 h-4" /> Todas
            </TabsTrigger>
            <TabsTrigger value="medicamentos" className="gap-1.5">
              <Pill className="w-4 h-4" /> Medicamentos
            </TabsTrigger>
            <TabsTrigger value="empreendimentos" className="gap-1.5">
              <Briefcase className="w-4 h-4" /> Empreendimentos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredEmpresas.length === 0 && (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma empresa cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Empresa" para começar.</p>
          </div>
        )}

        {/* Empresa cards */}
        <div className="grid gap-4">
          {filteredEmpresas.map((empresa) => {
            const certStatus = certValidade(empresa.certificado_digital_validade);
            return (
              <div key={empresa.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                      {empresa.segmento === 'Medicamentos' 
                        ? <Pill className="w-6 h-6 text-primary" />
                        : <Briefcase className="w-6 h-6 text-primary" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg truncate">{empresa.nome}</h3>
                      {empresa.razao_social && (
                        <p className="text-xs text-muted-foreground truncate">{empresa.razao_social}</p>
                      )}
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">{empresa.cnpj}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{empresa.municipio}/{empresa.uf}</span>
                        {empresa.cnae_codigo && (
                          <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />CNAE {empresa.cnae_codigo}</span>
                        )}
                        {empresa.email && (
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{empresa.email}</span>
                        )}
                        {empresa.telefone && (
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{empresa.telefone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap lg:flex-col items-start gap-2 shrink-0">
                    <Badge variant={empresa.segmento === 'Medicamentos' ? 'secondary' : 'outline'}>
                      {empresa.segmento}
                    </Badge>

                    {/* Gov.br */}
                    <div className={`flex items-center gap-1.5 text-xs ${empresa.govbr_vinculado ? 'text-success' : 'text-muted-foreground'}`}>
                      <Globe className="w-3.5 h-3.5" />
                      Gov.br {empresa.govbr_vinculado ? '✓' : '—'}
                    </div>

                    {/* SICAF */}
                    <div className={`flex items-center gap-1.5 text-xs ${getStatusColor(empresa.sicaf_status)}`}>
                      <Shield className="w-3.5 h-3.5" />
                      SICAF {empresa.sicaf_status || 'Pendente'}
                    </div>

                    {/* Certificado Digital */}
                    <div className={`flex items-center gap-1.5 text-xs ${
                      certStatus === 'valid' ? 'text-success' : certStatus === 'expiring' ? 'text-warning animate-pulse' : certStatus === 'expired' ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      <Key className="w-3.5 h-3.5" />
                      {empresa.certificado_digital_tipo 
                        ? `Cert. ${empresa.certificado_digital_tipo}` 
                        : 'Certificado —'}
                      {certStatus === 'expiring' && ' ⚠️'}
                      {certStatus === 'expired' && ' ❌'}
                    </div>

                    {/* Certidões */}
                    <div className={`flex items-center gap-1.5 text-xs ${empresa.certidoes_validas ? 'text-success' : 'text-destructive'}`}>
                      <FileCheck className="w-3.5 h-3.5" />
                      Certidões {empresa.certidoes_validas ? 'OK' : 'Pendentes'}
                    </div>

                    {empresa.segmento === 'Medicamentos' && (
                      <div className={`flex items-center gap-1.5 text-xs ${empresa.licenca_farmaceutica ? 'text-success' : 'text-destructive'}`}>
                        <Pill className="w-3.5 h-3.5" />
                        Lic. Farm. {empresa.licenca_farmaceutica ? '✓' : '—'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(empresa)}>
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(empresa.id)}>
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

      {/* Create/Edit Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingId ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="habilitacao">Habilitação</TabsTrigger>
              <TabsTrigger value="politica">Política</TabsTrigger>
            </TabsList>

            {/* Tab 1: Identificação */}
            <TabsContent value="identificacao" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nome Fantasia *</Label>
                  <Input value={formData.nome} onChange={e => setFormData(p => ({...p, nome: e.target.value}))} placeholder="Nome da empresa" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Razão Social</Label>
                  <Input value={formData.razao_social} onChange={e => setFormData(p => ({...p, razao_social: e.target.value}))} placeholder="Razão social completa" />
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
                <div className="sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={formData.endereco} onChange={e => setFormData(p => ({...p, endereco: e.target.value}))} placeholder="Endereço completo" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={formData.telefone} onChange={e => setFormData(p => ({...p, telefone: e.target.value}))} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="empresa@email.com" />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Habilitação */}
            <TabsContent value="habilitacao" className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Dados exigidos pela Lei 14.133/2021 para habilitação em licitações públicas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>CNAE - Código</Label>
                  <Input value={formData.cnae_codigo} onChange={e => setFormData(p => ({...p, cnae_codigo: e.target.value}))} placeholder="0000-0/00" />
                </div>
                <div>
                  <Label>CNAE - Descrição</Label>
                  <Input value={formData.cnae_descricao} onChange={e => setFormData(p => ({...p, cnae_descricao: e.target.value}))} placeholder="Atividade econômica" />
                </div>

                <Separator className="sm:col-span-2" />

                <div>
                  <Label>Certificado Digital - Tipo</Label>
                  <Select value={formData.certificado_digital_tipo} onValueChange={v => setFormData(p => ({...p, certificado_digital_tipo: v}))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 (Arquivo)</SelectItem>
                      <SelectItem value="A3">A3 (Token/Cartão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Certificado - Emissor</Label>
                  <Input value={formData.certificado_digital_emissor} onChange={e => setFormData(p => ({...p, certificado_digital_emissor: e.target.value}))} placeholder="Ex: Certisign, Serasa" />
                </div>
                <div>
                  <Label>Certificado - Validade</Label>
                  <Input type="date" value={formData.certificado_digital_validade} onChange={e => setFormData(p => ({...p, certificado_digital_validade: e.target.value}))} />
                </div>
                <div>
                  <Label>Status SICAF</Label>
                  <Select value={formData.sicaf_status} onValueChange={v => setFormData(p => ({...p, sicaf_status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Irregular">Irregular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="sm:col-span-2" />

                <div className="flex items-center justify-between sm:col-span-2 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <Label className="cursor-pointer">Conta Gov.br Vinculada</Label>
                  </div>
                  <Switch checked={formData.govbr_vinculado} onCheckedChange={v => setFormData(p => ({...p, govbr_vinculado: v}))} />
                </div>
                <div className="flex items-center justify-between sm:col-span-2 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-primary" />
                    <Label className="cursor-pointer">Certidões Válidas (Fiscal, Trabalhista, FGTS)</Label>
                  </div>
                  <Switch checked={formData.certidoes_validas} onCheckedChange={v => setFormData(p => ({...p, certidoes_validas: v}))} />
                </div>
                {formData.segmento === 'Medicamentos' && (
                  <div className="flex items-center justify-between sm:col-span-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" />
                      <Label className="cursor-pointer">Licença Farmacêutica / AFE Anvisa</Label>
                    </div>
                    <Switch checked={formData.licenca_farmaceutica} onCheckedChange={v => setFormData(p => ({...p, licenca_farmaceutica: v}))} />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Política */}
            <TabsContent value="politica" className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Defina a política de participação automática. O robô utilizará esses parâmetros para decidir em quais licitações esta empresa pode participar.
              </p>
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Resumo de Habilitação
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {formData.govbr_vinculado ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    Gov.br
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.sicaf_status === 'Regular' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
                    SICAF
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.certificado_digital_tipo ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    Certificado Digital
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.certidoes_validas ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    Certidões
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.cnae_codigo ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    CNAE
                  </div>
                  {formData.segmento === 'Medicamentos' && (
                    <div className="flex items-center gap-2">
                      {formData.licenca_farmaceutica ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      Licença Farm.
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning-foreground">
                <strong>⚠️ Atenção:</strong> O robô só participará de licitações se a empresa possuir Gov.br vinculado, SICAF regular, certificado digital válido e certidões em dia. Conforme exigido pela Lei 14.133/2021.
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSave} 
              disabled={createEmpresa.isPending || updateEmpresa.isPending || !formData.nome || !formData.cnpj || !formData.uf || !formData.municipio}
              className="gap-1.5"
            >
              {(createEmpresa.isPending || updateEmpresa.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Cadastrar Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Empresas;
