import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateEmpresa, type Empresa } from '@/hooks/useEmpresas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Building2, Save, Loader2, Shield, Key, Globe, FileCheck,
  MapPin, Phone, Mail, Hash, Briefcase, Pill, CheckCircle2,
  XCircle, AlertTriangle, Sparkles, ArrowLeft, Calendar, Search
} from 'lucide-react';

interface Props {
  empresa: Empresa;
  onBack: () => void;
}

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

export const EmpresaDetalhe = ({ empresa, onBack }: Props) => {
  const updateEmpresa = useUpdateEmpresa();
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [form, setForm] = useState({
    nome: empresa.nome || '',
    razao_social: empresa.razao_social || '',
    cnpj: empresa.cnpj || '',
    segmento: empresa.segmento as string,
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

  const hasEmpty = (val: string | null | undefined) => !val || val.trim() === '';

  const handleSave = async () => {
    const payload = {
      id: empresa.id,
      ...form,
      segmento: form.segmento as 'Medicamentos' | 'Empreendimentos',
      certificado_digital_validade: form.certificado_digital_validade
        ? new Date(form.certificado_digital_validade).toISOString() : null,
    };
    await updateEmpresa.mutateAsync(payload);
    setIsEditing(false);
  };

  const handleAISearch = async () => {
    if (!form.cnpj || form.cnpj.length < 14) {
      toast.error('Informe um CNPJ válido para buscar.');
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um assistente que busca dados de empresas brasileiras pelo CNPJ. Retorne APENAS um JSON válido (sem markdown, sem texto extra) com os campos que conseguir preencher. Os campos possíveis são: razao_social, cnae_codigo, cnae_descricao, endereco, municipio, uf, telefone, email. Se não souber um campo, omita-o. Exemplo: {"razao_social":"EMPRESA LTDA","cnae_codigo":"4771-7/01","cnae_descricao":"Comércio varejista de produtos farmacêuticos","uf":"PA","municipio":"Belém"}`
            },
            {
              role: 'user',
              content: `Busque dados da empresa com CNPJ: ${form.cnpj}. Retorne apenas o JSON.`
            }
          ]
        }
      });

      if (error) throw error;
      const content = data?.content || '';
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setForm(prev => ({
          ...prev,
          ...(parsed.razao_social && !prev.razao_social ? { razao_social: parsed.razao_social } : {}),
          ...(parsed.cnae_codigo && !prev.cnae_codigo ? { cnae_codigo: parsed.cnae_codigo } : {}),
          ...(parsed.cnae_descricao && !prev.cnae_descricao ? { cnae_descricao: parsed.cnae_descricao } : {}),
          ...(parsed.endereco && !prev.endereco ? { endereco: parsed.endereco } : {}),
          ...(parsed.municipio && !prev.municipio ? { municipio: parsed.municipio } : {}),
          ...(parsed.uf && !prev.uf ? { uf: parsed.uf } : {}),
          ...(parsed.telefone && !prev.telefone ? { telefone: parsed.telefone } : {}),
          ...(parsed.email && !prev.email ? { email: parsed.email } : {}),
        }));
        setIsEditing(true);
        toast.success('Dados encontrados! Campos vazios foram preenchidos. Revise e salve.');
      } else {
        toast.info('Não foi possível encontrar dados automáticos. Preencha manualmente.');
      }
    } catch {
      toast.error('Erro ao buscar dados. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const certStatus = (() => {
    if (!empresa.certificado_digital_validade) return null;
    const d = new Date(empresa.certificado_digital_validade);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'expired';
    if (diff < 15) return 'expiring';
    return 'valid';
  })();

  // Status summary for compliance
  const checks = [
    { label: 'Gov.br Vinculado', ok: form.govbr_vinculado, icon: Globe },
    { label: 'SICAF Regular', ok: form.sicaf_status === 'Regular', icon: Shield },
    { label: 'Certificado Digital', ok: !!form.certificado_digital_tipo && certStatus !== 'expired', icon: Key },
    { label: 'Certidões Válidas', ok: form.certidoes_validas, icon: FileCheck },
    { label: 'CNAE Cadastrado', ok: !!form.cnae_codigo, icon: Hash },
    ...(form.segmento === 'Medicamentos' ? [{ label: 'Licença Farmacêutica', ok: form.licenca_farmaceutica, icon: Pill }] : []),
  ];

  const allOk = checks.every(c => c.ok);

  const InfoRow = ({ icon: Icon, label, value, field, type = 'text' }: {
    icon: any; label: string; value: string; field: string; type?: string;
  }) => (
    <div className="flex items-start gap-3 py-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isEditing ? (
          <Input
            type={type}
            value={(form as any)[field] || ''}
            onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
            className="mt-1 h-8 text-sm"
            placeholder={`Informe ${label.toLowerCase()}`}
          />
        ) : (
          <p className={`text-sm font-medium ${hasEmpty(value) ? 'text-warning italic' : ''}`}>
            {hasEmpty(value) ? '⚠️ Não informado — clique Editar' : value}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-3 rounded-xl bg-primary/10">
            {empresa.segmento === 'Medicamentos'
              ? <Pill className="w-6 h-6 text-primary" />
              : <Briefcase className="w-6 h-6 text-primary" />}
          </div>
          <div>
            <h2 className="text-xl font-bold">{empresa.nome}</h2>
            <p className="text-sm text-muted-foreground font-mono">{empresa.cnpj}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleAISearch}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isSearching ? 'Buscando...' : 'IA Preencher'}
          </Button>

          {isEditing ? (
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={updateEmpresa.isPending}>
              {updateEmpresa.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Compliance Summary */}
      <div className={`rounded-xl border p-4 ${allOk ? 'bg-success/5 border-success/30' : 'bg-warning/5 border-warning/30'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5" />
          <h3 className="font-semibold text-sm">
            Habilitação — Lei 14.133/2021
          </h3>
          <Badge variant={allOk ? 'default' : 'outline'} className={allOk ? 'bg-success text-success-foreground' : ''}>
            {allOk ? 'APTA' : 'PENDÊNCIAS'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {c.ok
                ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
              <span className={c.ok ? '' : 'text-destructive'}>{c.label}</span>
            </div>
          ))}
        </div>
        {!allOk && (
          <p className="text-xs text-warning mt-2">
            ⚠️ Complete todos os itens para que o robô possa participar de licitações com esta empresa.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identificação */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Identificação
          </h3>
          <Separator className="mb-2" />
          <InfoRow icon={Building2} label="Nome Fantasia" value={form.nome} field="nome" />
          <InfoRow icon={Building2} label="Razão Social" value={form.razao_social} field="razao_social" />
          <InfoRow icon={Hash} label="CNPJ" value={form.cnpj} field="cnpj" />
          <div className="flex items-start gap-3 py-3">
            <Briefcase className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Segmento</p>
              {isEditing ? (
                <Select value={form.segmento} onValueChange={v => setForm(p => ({ ...p, segmento: v }))}>
                  <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                    <SelectItem value="Empreendimentos">Empreendimentos</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className="mt-1">{form.segmento}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Localização & Contato */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Localização & Contato
          </h3>
          <Separator className="mb-2" />
          <div className="flex items-start gap-3 py-3">
            <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">UF</p>
              {isEditing ? (
                <Select value={form.uf} onValueChange={v => setForm(p => ({ ...p, uf: v }))}>
                  <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className={`text-sm font-medium ${!form.uf ? 'text-warning italic' : ''}`}>
                  {form.uf || '⚠️ Não informado'}
                </p>
              )}
            </div>
          </div>
          <InfoRow icon={MapPin} label="Município" value={form.municipio} field="municipio" />
          <InfoRow icon={MapPin} label="Endereço Completo" value={form.endereco} field="endereco" />
          <InfoRow icon={Phone} label="Telefone" value={form.telefone} field="telefone" />
          <InfoRow icon={Mail} label="E-mail" value={form.email} field="email" type="email" />
        </div>

        {/* Habilitação Técnica */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Habilitação Técnica
          </h3>
          <Separator className="mb-2" />
          <InfoRow icon={Hash} label="CNAE - Código" value={form.cnae_codigo} field="cnae_codigo" />
          <InfoRow icon={Hash} label="CNAE - Descrição" value={form.cnae_descricao} field="cnae_descricao" />

          <div className="flex items-start gap-3 py-3">
            <Shield className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Status SICAF</p>
              {isEditing ? (
                <Select value={form.sicaf_status} onValueChange={v => setForm(p => ({ ...p, sicaf_status: v }))}>
                  <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Irregular">Irregular</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={form.sicaf_status === 'Regular' ? 'default' : 'outline'}
                  className={form.sicaf_status === 'Regular' ? 'bg-success text-success-foreground' : form.sicaf_status === 'Irregular' ? 'bg-destructive text-destructive-foreground' : ''}>
                  {form.sicaf_status}
                </Badge>
              )}
            </div>
          </div>

          {/* Switches for habilitação */}
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-sm">Gov.br Vinculado</span>
              </div>
              {isEditing ? (
                <Switch checked={form.govbr_vinculado} onCheckedChange={v => setForm(p => ({ ...p, govbr_vinculado: v }))} />
              ) : (
                form.govbr_vinculado
                  ? <CheckCircle2 className="w-4 h-4 text-success" />
                  : <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                <span className="text-sm">Certidões Válidas</span>
              </div>
              {isEditing ? (
                <Switch checked={form.certidoes_validas} onCheckedChange={v => setForm(p => ({ ...p, certidoes_validas: v }))} />
              ) : (
                form.certidoes_validas
                  ? <CheckCircle2 className="w-4 h-4 text-success" />
                  : <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            {form.segmento === 'Medicamentos' && (
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  <span className="text-sm">Licença Farmacêutica</span>
                </div>
                {isEditing ? (
                  <Switch checked={form.licenca_farmaceutica} onCheckedChange={v => setForm(p => ({ ...p, licenca_farmaceutica: v }))} />
                ) : (
                  form.licenca_farmaceutica
                    ? <CheckCircle2 className="w-4 h-4 text-success" />
                    : <XCircle className="w-4 h-4 text-destructive" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Certificado Digital */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" /> Certificado Digital
          </h3>
          <Separator className="mb-2" />

          <div className="flex items-start gap-3 py-3">
            <Key className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Tipo</p>
              {isEditing ? (
                <Select value={form.certificado_digital_tipo} onValueChange={v => setForm(p => ({ ...p, certificado_digital_tipo: v }))}>
                  <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A1">A1 (Arquivo)</SelectItem>
                    <SelectItem value="A3">A3 (Token/Cartão)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className={`text-sm font-medium ${!form.certificado_digital_tipo ? 'text-warning italic' : ''}`}>
                  {form.certificado_digital_tipo ? `Tipo ${form.certificado_digital_tipo}` : '⚠️ Não informado'}
                </p>
              )}
            </div>
          </div>

          <InfoRow icon={Building2} label="Emissor" value={form.certificado_digital_emissor} field="certificado_digital_emissor" />
          <InfoRow icon={Calendar} label="Validade" value={form.certificado_digital_validade} field="certificado_digital_validade" type="date" />

          {certStatus && (
            <div className={`mt-2 p-3 rounded-lg text-sm flex items-center gap-2 ${
              certStatus === 'valid' ? 'bg-success/10 text-success' :
              certStatus === 'expiring' ? 'bg-warning/10 text-warning animate-pulse' :
              'bg-destructive/10 text-destructive'
            }`}>
              {certStatus === 'valid' && <><CheckCircle2 className="w-4 h-4" /> Certificado válido</>}
              {certStatus === 'expiring' && <><AlertTriangle className="w-4 h-4" /> Certificado expirando em breve!</>}
              {certStatus === 'expired' && <><XCircle className="w-4 h-4" /> Certificado expirado — renove imediatamente</>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
