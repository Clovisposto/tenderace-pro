import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Mail,
  Phone,
  MessageSquare,
  Trophy,
  XCircle,
  Target,
  Clock,
  Zap,
  Sparkles,
  Volume2,
  VolumeX,
  Save,
  TestTube,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Filter,
  DollarSign,
} from 'lucide-react';
import { useConfiguracoes, useUpdateConfiguracoes } from '@/hooks/useConfiguracoes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const NOTIFICATION_EVENTS = [
  { 
    id: 'vitoria', 
    field: 'notificacoes_vitoria',
    label: 'Vitória em Licitação', 
    description: 'Quando você vence uma disputa',
    icon: Trophy, 
    color: 'text-success',
    priority: 'alta'
  },
  { 
    id: 'derrota', 
    field: 'notificacoes_derrota',
    label: 'Derrota em Licitação', 
    description: 'Quando perde uma disputa',
    icon: XCircle, 
    color: 'text-destructive',
    priority: 'media'
  },
  { 
    id: 'nova_licitacao', 
    field: 'notificacoes_nova_licitacao',
    label: 'Nova Licitação Captada', 
    description: 'Quando o robô encontra novas oportunidades',
    icon: Target, 
    color: 'text-primary',
    priority: 'media'
  },
  { 
    id: 'prazo_urgente', 
    field: 'notificacoes_prazo_urgente',
    label: 'Prazo Urgente', 
    description: 'Licitações com menos de 24h para encerrar',
    icon: Clock, 
    color: 'text-warning',
    priority: 'alta'
  },
  { 
    id: 'disputa', 
    field: 'notificacoes_disputa',
    label: 'Disputa Ativa', 
    description: 'Quando o robô entra em disputa',
    icon: Zap, 
    color: 'text-accent',
    priority: 'alta'
  },
];

export function NotificationPreferences() {
  const { data: config, isLoading } = useConfiguracoes();
  const updateConfig = useUpdateConfiguracoes();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState({
    // Channels
    email: true,
    push: true,
    telefone: false,
    telefoneNumero: '',
    somNotificacao: true,
    
    // Events
    notificacoesVitoria: true,
    notificacoesDerrota: true,
    notificacoesNovaLicitacao: true,
    notificacoesPrazoUrgente: true,
    notificacoesDisputa: true,
    
    // Filters
    valorMinNotificacao: 5000,
    valorMaxNotificacao: 50000,
    apenasAltaPrioridade: false,
    horariosPermitidos: 'todos', // todos, comercial, personalizado
  });

  useEffect(() => {
    if (config) {
      setPreferences({
        email: config.notificacoes_email ?? true,
        push: config.notificacoes_push ?? true,
        telefone: (config as any).notificacoes_telefone ?? false,
        telefoneNumero: (config as any).telefone_notificacao || '',
        somNotificacao: (config as any).som_notificacao ?? true,
        notificacoesVitoria: (config as any).notificacoes_vitoria ?? true,
        notificacoesDerrota: (config as any).notificacoes_derrota ?? true,
        notificacoesNovaLicitacao: (config as any).notificacoes_nova_licitacao ?? true,
        notificacoesPrazoUrgente: (config as any).notificacoes_prazo_urgente ?? true,
        notificacoesDisputa: (config as any).notificacoes_disputa ?? true,
        valorMinNotificacao: 5000,
        valorMaxNotificacao: 50000,
        apenasAltaPrioridade: false,
        horariosPermitidos: 'todos',
      });
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate({
      notificacoes_email: preferences.email,
      notificacoes_push: preferences.push,
      notificacoes_telefone: preferences.telefone,
      telefone_notificacao: preferences.telefoneNumero,
      som_notificacao: preferences.somNotificacao,
      notificacoes_vitoria: preferences.notificacoesVitoria,
      notificacoes_derrota: preferences.notificacoesDerrota,
      notificacoes_nova_licitacao: preferences.notificacoesNovaLicitacao,
      notificacoes_prazo_urgente: preferences.notificacoesPrazoUrgente,
      notificacoes_disputa: preferences.notificacoesDisputa,
    });
  };

  const sendTestNotification = async () => {
    try {
      await supabase.functions.invoke('notificar', {
        body: {
          tipo: 'alerta_compliance',
          titulo: 'Teste de Notificação',
          mensagem: 'Esta é uma notificação de teste do sistema LicitaIA.',
          dados: {
            timestamp: new Date().toISOString(),
          },
        },
      });
      
      toast({
        title: 'Notificação de teste enviada',
        description: 'Verifique seus canais ativos.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao enviar teste',
        description: 'Tente novamente em alguns segundos.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-lg" />
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Preferências de Notificação</h3>
            <p className="text-sm text-muted-foreground">
              Personalize como e quando receber alertas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={sendTestNotification}>
            <TestTube className="w-4 h-4 mr-1" />
            Testar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateConfig.isPending}>
            <Save className="w-4 h-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>
            Escolha por onde deseja receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${preferences.email ? 'bg-success/20' : 'bg-muted'}`}>
                <Mail className={`w-4 h-4 ${preferences.email ? 'text-success' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium text-sm">Email</p>
                <p className="text-xs text-muted-foreground">Receba alertas por email</p>
              </div>
            </div>
            <Switch
              checked={preferences.email}
              onCheckedChange={(checked) => setPreferences(p => ({ ...p, email: checked }))}
            />
          </div>

          {/* Push */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${preferences.push ? 'bg-success/20' : 'bg-muted'}`}>
                <Bell className={`w-4 h-4 ${preferences.push ? 'text-success' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium text-sm">Push (Navegador)</p>
                <p className="text-xs text-muted-foreground">Notificações em tempo real no navegador</p>
              </div>
            </div>
            <Switch
              checked={preferences.push}
              onCheckedChange={(checked) => setPreferences(p => ({ ...p, push: checked }))}
            />
          </div>

          {/* WhatsApp/Telefone */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${preferences.telefone ? 'bg-success/20' : 'bg-muted'}`}>
                  <MessageSquare className={`w-4 h-4 ${preferences.telefone ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">WhatsApp / SMS</p>
                  <p className="text-xs text-muted-foreground">Alertas urgentes no celular</p>
                </div>
              </div>
              <Switch
                checked={preferences.telefone}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, telefone: checked }))}
              />
            </div>
            {preferences.telefone && (
              <div className="ml-11">
                <Label className="text-xs text-muted-foreground">Número do WhatsApp</Label>
                <Input
                  placeholder="+55 11 99999-9999"
                  value={preferences.telefoneNumero}
                  onChange={(e) => setPreferences(p => ({ ...p, telefoneNumero: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${preferences.somNotificacao ? 'bg-success/20' : 'bg-muted'}`}>
                {preferences.somNotificacao ? (
                  <Volume2 className="w-4 h-4 text-success" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">Som de Notificação</p>
                <p className="text-xs text-muted-foreground">Alerta sonoro para eventos importantes</p>
              </div>
            </div>
            <Switch
              checked={preferences.somNotificacao}
              onCheckedChange={(checked) => setPreferences(p => ({ ...p, somNotificacao: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Tipos de Evento
          </CardTitle>
          <CardDescription>
            Selecione quais eventos devem gerar notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIFICATION_EVENTS.map((event) => {
            const Icon = event.icon;
            const fieldKey = event.field.replace('notificacoes_', '');
            const prefKey = `notificacoes${fieldKey.charAt(0).toUpperCase()}${fieldKey.slice(1).replace(/_([a-z])/g, (_, l) => l.toUpperCase())}` as keyof typeof preferences;
            const isEnabled = preferences[prefKey] as boolean;
            
            return (
              <div 
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-4 h-4 ${isEnabled ? event.color : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{event.label}</p>
                      {event.priority === 'alta' && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Importante
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => setPreferences(p => ({ ...p, [prefKey]: checked }))}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros Avançados
          </CardTitle>
          <CardDescription>
            Refine quais notificações você recebe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Value Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Faixa de Valor
              </Label>
              <span className="text-xs text-muted-foreground">
                R$ {preferences.valorMinNotificacao.toLocaleString()} - R$ {preferences.valorMaxNotificacao.toLocaleString()}
              </span>
            </div>
            <div className="px-2">
              <Slider
                defaultValue={[preferences.valorMinNotificacao, preferences.valorMaxNotificacao]}
                min={1000}
                max={100000}
                step={1000}
                onValueChange={([min, max]) => setPreferences(p => ({ 
                  ...p, 
                  valorMinNotificacao: min, 
                  valorMaxNotificacao: max 
                }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Só notificar licitações dentro desta faixa de valor
            </p>
          </div>

          <Separator />

          {/* Priority Filter */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Apenas Alta Prioridade
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Filtrar apenas alertas classificados como urgentes
              </p>
            </div>
            <Switch
              checked={preferences.apenasAltaPrioridade}
              onCheckedChange={(checked) => setPreferences(p => ({ ...p, apenasAltaPrioridade: checked }))}
            />
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Horários de Notificação
            </Label>
            <Select
              value={preferences.horariosPermitidos}
              onValueChange={(value) => setPreferences(p => ({ ...p, horariosPermitidos: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">24 horas (sempre notificar)</SelectItem>
                <SelectItem value="comercial">Horário comercial (8h-18h)</SelectItem>
                <SelectItem value="estendido">Estendido (6h-22h)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-success/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-sm">Configuração Ativa</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    preferences.email && 'Email',
                    preferences.push && 'Push',
                    preferences.telefone && 'WhatsApp'
                  ].filter(Boolean).join(', ') || 'Nenhum canal ativo'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Bell className="w-3 h-3" />
              {Object.values(preferences).filter(v => v === true).length - 1} eventos ativos
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
