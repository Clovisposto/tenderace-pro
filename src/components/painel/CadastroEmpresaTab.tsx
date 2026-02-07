import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, Plus, CheckCircle2, AlertTriangle, XCircle, 
  MapPin, Calendar, FileText, Shield, Key, Globe, Trash2, Edit,
  Save, X
} from 'lucide-react';
import { useEmpresas, useCreateEmpresa, useUpdateEmpresa, useDeleteEmpresa } from '@/hooks/useEmpresas';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UFS_BRASIL = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];

interface EmpresaForm {
  nome: string;
  cnpj: string;
  razao_social: string;
  uf: string;
  municipio: string;
  endereco: string;
  telefone: string;
  email: string;
  segmento: 'Medicamentos' | 'Empreendimentos';
  cnae_codigo: string;
  cnae_descricao: string;
  certificado_digital_tipo: string;
  certificado_digital_validade: string;
  certificado_digital_emissor: string;
  govbr_vinculado: boolean;
  sicaf_status: string;
  certidoes_validas: boolean;
  licenca_farmaceutica: boolean;
  politica_participacao: {
    ufs_priorizadas: string[];
    modalidades: string[];
    valor_min: number;
    valor_max: number;
    margem_minima: number;
  };
}

const INITIAL_FORM: EmpresaForm = {
  nome: '', cnpj: '', razao_social: '', uf: '', municipio: '', endereco: '',
  telefone: '', email: '', segmento: 'Empreendimentos',
  cnae_codigo: '', cnae_descricao: '',
  certificado_digital_tipo: '', certificado_digital_validade: '', certificado_digital_emissor: '',
  govbr_vinculado: false, sicaf_status: 'Pendente', certidoes_validas: false, licenca_farmaceutica: false,
  politica_participacao: { ufs_priorizadas: [], modalidades: ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'], valor_min: 1000, valor_max: 35000, margem_minima: 8 },
};

export function CadastroEmpresaTab() {
  const { data: empresas, isLoading } = useEmpresas();
  const createEmpresa = useCreateEmpresa();
  const updateEmpresa = useUpdateEmpresa();
  const deleteEmpresa = useDeleteEmpresa();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmpresaForm>(INITIAL_FORM);

  const handleSubmit = () => {
    if (!form.nome || !form.cnpj || !form.uf || !form.municipio) return;

    const payload: any = {
      nome: form.nome.trim(),
      cnpj: form.cnpj.trim(),
      razao_social: form.razao_social.trim() || null,
      uf: form.uf,
      municipio: form.municipio.trim(),
      endereco: form.endereco.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      segmento: form.segmento,
      cnae_codigo: form.cnae_codigo.trim() || null,
      cnae_descricao: form.cnae_descricao.trim() || null,
      certificado_digital_tipo: form.certificado_digital_tipo || null,
      certificado_digital_validade: form.certificado_digital_validade || null,
      certificado_digital_emissor: form.certificado_digital_emissor.trim() || null,
      govbr_vinculado: form.govbr_vinculado,
      sicaf_status: form.sicaf_status,
      certidoes_validas: form.certidoes_validas,
      licenca_farmaceutica: form.licenca_farmaceutica,
      politica_participacao: form.politica_participacao,
    };

    if (editingId) {
      updateEmpresa.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { setShowForm(false); setEditingId(null); setForm(INITIAL_FORM); }
      });
    } else {
      createEmpresa.mutate(payload, {
        onSuccess: () => { setShowForm(false); setForm(INITIAL_FORM); }
      });
    }
  };

  const handleEdit = (empresa: any) => {
    setEditingId(empresa.id);
    setForm({
      nome: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      razao_social: empresa.razao_social || '',
      uf: empresa.uf || '',
      municipio: empresa.municipio || '',
      endereco: empresa.endereco || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      segmento: empresa.segmento || 'Empreendimentos',
      cnae_codigo: empresa.cnae_codigo || '',
      cnae_descricao: empresa.cnae_descricao || '',
      certificado_digital_tipo: empresa.certificado_digital_tipo || '',
      certificado_digital_validade: empresa.certificado_digital_validade || '',
      certificado_digital_emissor: empresa.certificado_digital_emissor || '',
      govbr_vinculado: empresa.govbr_vinculado || false,
      sicaf_status: empresa.sicaf_status || 'Pendente',
      certidoes_validas: empresa.certidoes_validas || false,
      licenca_farmaceutica: empresa.licenca_farmaceutica || false,
      politica_participacao: empresa.politica_participacao || INITIAL_FORM.politica_participacao,
    });
    setShowForm(true);
  };

  const toggleUfPolitica = (uf: string) => {
    setForm(prev => {
      const ufs = prev.politica_participacao.ufs_priorizadas;
      return {
        ...prev,
        politica_participacao: {
          ...prev.politica_participacao,
          ufs_priorizadas: ufs.includes(uf) ? ufs.filter(u => u !== uf) : [...ufs, uf],
        }
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cadastro e Identificação</h2>
          <p className="text-sm text-muted-foreground">Gerencie empresas, segmentos, certificados e políticas de participação</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(INITIAL_FORM); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Empresa
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingId ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados Básicos */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Dados da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><Label>Nome Fantasia *</Label><Input value={form.nome} onChange={e => setForm(p => ({...p, nome: e.target.value}))} placeholder="Nome da empresa" /></div>
                <div><Label>CNPJ *</Label><Input value={form.cnpj} onChange={e => setForm(p => ({...p, cnpj: e.target.value}))} placeholder="00.000.000/0000-00" /></div>
                <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={e => setForm(p => ({...p, razao_social: e.target.value}))} placeholder="Razão social completa" /></div>
                <div>
                  <Label>UF *</Label>
                  <Select value={form.uf} onValueChange={v => setForm(p => ({...p, uf: v}))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{UFS_BRASIL.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Município *</Label><Input value={form.municipio} onChange={e => setForm(p => ({...p, municipio: e.target.value}))} placeholder="Cidade" /></div>
                <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm(p => ({...p, endereco: e.target.value}))} placeholder="Endereço completo" /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(p => ({...p, telefone: e.target.value}))} placeholder="(XX) XXXXX-XXXX" /></div>
                <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="contato@empresa.com" type="email" /></div>
              </div>
            </div>

            <Separator />

            {/* Segmento e CNAE */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Segmento e Atividade</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Segmento *</Label>
                  <Select value={form.segmento} onValueChange={(v: any) => setForm(p => ({...p, segmento: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                      <SelectItem value="Empreendimentos">Empreendimentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>CNAE Código</Label><Input value={form.cnae_codigo} onChange={e => setForm(p => ({...p, cnae_codigo: e.target.value}))} placeholder="Ex: 4771-7/01" /></div>
                <div><Label>CNAE Descrição</Label><Input value={form.cnae_descricao} onChange={e => setForm(p => ({...p, cnae_descricao: e.target.value}))} placeholder="Descrição da atividade" /></div>
              </div>
              {form.segmento === 'Medicamentos' && (
                <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Switch checked={form.licenca_farmaceutica} onCheckedChange={v => setForm(p => ({...p, licenca_farmaceutica: v}))} />
                  <Label>Licença Farmacêutica (AFE/AE)</Label>
                </div>
              )}
            </div>

            <Separator />

            {/* Integrações */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Integrações e Certificados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gov.br */}
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="font-medium">Gov.br</span>
                    <Badge variant={form.govbr_vinculado ? 'default' : 'secondary'} className="ml-auto">
                      {form.govbr_vinculado ? 'Vinculado' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.govbr_vinculado} onCheckedChange={v => setForm(p => ({...p, govbr_vinculado: v}))} />
                    <Label className="text-sm">Conta Gov.br vinculada</Label>
                  </div>
                </Card>

                {/* SICAF */}
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-medium">SICAF</span>
                    <Badge variant={form.sicaf_status === 'Regular' ? 'default' : 'secondary'} className="ml-auto">
                      {form.sicaf_status}
                    </Badge>
                  </div>
                  <Select value={form.sicaf_status} onValueChange={v => setForm(p => ({...p, sicaf_status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-3 mt-3">
                    <Switch checked={form.certidoes_validas} onCheckedChange={v => setForm(p => ({...p, certidoes_validas: v}))} />
                    <Label className="text-sm">Certidões válidas</Label>
                  </div>
                </Card>
              </div>

              {/* Certificado Digital */}
              <Card className="p-4 mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <Key className="w-5 h-5 text-primary" />
                  <span className="font-medium">Certificado Digital</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.certificado_digital_tipo} onValueChange={v => setForm(p => ({...p, certificado_digital_tipo: v}))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1 (Arquivo)</SelectItem>
                        <SelectItem value="A3">A3 (Token/Cartão)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Validade</Label><Input type="date" value={form.certificado_digital_validade ? form.certificado_digital_validade.split('T')[0] : ''} onChange={e => setForm(p => ({...p, certificado_digital_validade: e.target.value}))} /></div>
                  <div><Label>Emissor (AC)</Label><Input value={form.certificado_digital_emissor} onChange={e => setForm(p => ({...p, certificado_digital_emissor: e.target.value}))} placeholder="Ex: Certisign, Serasa" /></div>
                </div>
              </Card>
            </div>

            <Separator />

            {/* Política de Participação */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Política de Participação</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><Label>Valor Mínimo (R$)</Label><Input type="number" value={form.politica_participacao.valor_min} onChange={e => setForm(p => ({...p, politica_participacao: {...p.politica_participacao, valor_min: Number(e.target.value)}}))} /></div>
                <div><Label>Valor Máximo (R$)</Label><Input type="number" value={form.politica_participacao.valor_max} onChange={e => setForm(p => ({...p, politica_participacao: {...p.politica_participacao, valor_max: Number(e.target.value)}}))} /></div>
                <div><Label>Margem Mínima (%)</Label><Input type="number" value={form.politica_participacao.margem_minima} onChange={e => setForm(p => ({...p, politica_participacao: {...p.politica_participacao, margem_minima: Number(e.target.value)}}))} /></div>
              </div>
              <div>
                <Label className="mb-2 block">UFs Prioritárias</Label>
                <div className="flex flex-wrap gap-2">
                  {UFS_BRASIL.map(uf => (
                    <Badge
                      key={uf}
                      variant={form.politica_participacao.ufs_priorizadas.includes(uf) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleUfPolitica(uf)}
                    >
                      {uf}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(INITIAL_FORM); }}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createEmpresa.isPending || updateEmpresa.isPending}>
                <Save className="w-4 h-4 mr-2" /> {editingId ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Empresas */}
      {isLoading ? (
        <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : empresas && empresas.length > 0 ? (
        <div className="space-y-4">
          {empresas.map((empresa: any) => (
            <Card key={empresa.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{empresa.nome}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{empresa.cnpj}</p>
                      {empresa.cnae_codigo && (
                        <p className="text-xs text-muted-foreground mt-1">CNAE: {empresa.cnae_codigo} — {empresa.cnae_descricao}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{empresa.municipio}/{empresa.uf}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(empresa.updated_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={empresa.segmento === 'Medicamentos' ? 'default' : 'secondary'}>{empresa.segmento}</Badge>
                    <div className="flex items-center gap-3 text-sm">
                      {empresa.govbr_vinculado && <Badge variant="outline" className="text-xs gap-1"><Globe className="w-3 h-3" />Gov.br</Badge>}
                      {empresa.certificado_digital_tipo && <Badge variant="outline" className="text-xs gap-1"><Key className="w-3 h-3" />{empresa.certificado_digital_tipo}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {empresa.sicaf_status === 'Regular' ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" />SICAF OK</span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-4 h-4" />SICAF {empresa.sicaf_status}</span>
                      )}
                      {empresa.certidoes_validas ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" />Certidões</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" />Certidões</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    {empresa.politica_participacao?.ufs_priorizadas?.length > 0 
                      ? `UFs: ${empresa.politica_participacao.ufs_priorizadas.join(', ')}`
                      : 'Sem política definida'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(empresa)}>
                      <Edit className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteEmpresa.mutate(empresa.id)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !showForm ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nenhuma empresa cadastrada ainda</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Cadastrar Primeira Empresa
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
