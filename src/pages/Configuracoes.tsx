import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Zap,
  DollarSign,
  Clock,
  Save,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useConfiguracoes, useUpdateConfiguracoes } from '@/hooks/useConfiguracoes';

const Configuracoes = () => {
  const { data: savedConfig, isLoading } = useConfiguracoes();
  const updateConfig = useUpdateConfiguracoes();
  
  const [configs, setConfigs] = useState({
    valorMinimo: 1000,
    valorMaximo: 35000,
    margemMinima: 8,
    lanceAutomatico: true,
    notificacoesEmail: true,
    notificacoesPush: true,
    captacaoContinua: true,
    prioridadeInterior: true,
  });

  useEffect(() => {
    if (savedConfig) {
      setConfigs({
        valorMinimo: savedConfig.valor_minimo || 1000,
        valorMaximo: savedConfig.valor_maximo || 35000,
        margemMinima: savedConfig.margem_minima || 8,
        lanceAutomatico: savedConfig.lance_automatico ?? true,
        notificacoesEmail: savedConfig.notificacoes_email ?? true,
        notificacoesPush: savedConfig.notificacoes_push ?? true,
        captacaoContinua: savedConfig.captacao_continua ?? true,
        prioridadeInterior: savedConfig.prioridade_interior ?? true,
      });
    }
  }, [savedConfig]);

  const handleSave = () => {
    updateConfig.mutate({
      valor_minimo: configs.valorMinimo,
      valor_maximo: configs.valorMaximo,
      margem_minima: configs.margemMinima,
      lance_automatico: configs.lanceAutomatico,
      notificacoes_email: configs.notificacoesEmail,
      notificacoes_push: configs.notificacoesPush,
      captacao_continua: configs.captacaoContinua,
      prioridade_interior: configs.prioridadeInterior,
    });
  };

  return (
    <MainLayout title="Configurações">
      <div className="max-w-3xl space-y-8">
        {/* Políticas de Captação */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Políticas de Captação</h3>
              <p className="text-sm text-muted-foreground">Configure os parâmetros de busca de licitações</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Mínimo (R$)</label>
              <Input
                type="number"
                value={configs.valorMinimo}
                onChange={(e) => setConfigs({ ...configs, valorMinimo: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Máximo (R$)</label>
              <Input
                type="number"
                value={configs.valorMaximo}
                onChange={(e) => setConfigs({ ...configs, valorMaximo: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Margem Mínima (%)</label>
            <Input
              type="number"
              value={configs.margemMinima}
              onChange={(e) => setConfigs({ ...configs, margemMinima: parseInt(e.target.value) })}
              className="max-w-[200px]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Prioridade Interior</p>
              <p className="text-sm text-muted-foreground">Priorizar licitações de municípios do interior</p>
            </div>
            <Switch
              checked={configs.prioridadeInterior}
              onCheckedChange={(checked) => setConfigs({ ...configs, prioridadeInterior: checked })}
            />
          </div>
        </div>

        {/* Automação */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Automação</h3>
              <p className="text-sm text-muted-foreground">Configure o comportamento automático da IA</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Captação Contínua 24/7</p>
                <p className="text-sm text-muted-foreground">Buscar novas licitações automaticamente</p>
              </div>
              <Switch
                checked={configs.captacaoContinua}
                onCheckedChange={(checked) => setConfigs({ ...configs, captacaoContinua: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lance Automático</p>
                <p className="text-sm text-muted-foreground">Enviar lances automaticamente após autorização</p>
              </div>
              <Switch
                checked={configs.lanceAutomatico}
                onCheckedChange={(checked) => setConfigs({ ...configs, lanceAutomatico: checked })}
              />
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Bell className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Notificações</h3>
              <p className="text-sm text-muted-foreground">Configure como deseja receber alertas</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificações por Email</p>
                <p className="text-sm text-muted-foreground">Receber alertas importantes por email</p>
              </div>
              <Switch
                checked={configs.notificacoesEmail}
                onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesEmail: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificações Push</p>
                <p className="text-sm text-muted-foreground">Receber notificações no navegador</p>
              </div>
              <Switch
                checked={configs.notificacoesPush}
                onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesPush: checked })}
              />
            </div>
          </div>
        </div>

        {/* Governança */}
        <div className="glass-card p-6 space-y-4 animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Governança</h3>
              <p className="text-sm text-muted-foreground">Conformidade e segurança</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>Lei 14.133/2021 - Licitações e Contratos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>LGPD - Lei Geral de Proteção de Dados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>Logs auditáveis completos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>Segregação por empresa</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Configuracoes;
