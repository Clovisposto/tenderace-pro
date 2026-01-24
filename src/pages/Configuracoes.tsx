import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Zap,
  DollarSign,
  Clock,
  Save,
  RefreshCw,
  MapPin,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useConfiguracoes, useUpdateConfiguracoes } from '@/hooks/useConfiguracoes';

// Todos os 27 estados brasileiros
const TODOS_ESTADOS = [
  { uf: 'AC', nome: 'Acre', regiao: 'Norte' },
  { uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { uf: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { uf: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { uf: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  { uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { uf: 'PA', nome: 'Pará', regiao: 'Norte' },
  { uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { uf: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { uf: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { uf: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { uf: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  { uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  { uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  { uf: 'TO', nome: 'Tocantins', regiao: 'Norte' },
];

const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

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
    ufsPriorizadas: ['PA', 'TO', 'GO', 'MA'] as string[],
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
        ufsPriorizadas: savedConfig.ufs_priorizadas || ['PA', 'TO', 'GO', 'MA'],
      });
    }
  }, [savedConfig]);

  const handleToggleUF = (uf: string) => {
    setConfigs(prev => ({
      ...prev,
      ufsPriorizadas: prev.ufsPriorizadas.includes(uf)
        ? prev.ufsPriorizadas.filter(u => u !== uf)
        : [...prev.ufsPriorizadas, uf]
    }));
  };

  const handleToggleRegiao = (regiao: string) => {
    const ufsRegiao = TODOS_ESTADOS.filter(e => e.regiao === regiao).map(e => e.uf);
    const todasSelecionadas = ufsRegiao.every(uf => configs.ufsPriorizadas.includes(uf));
    
    if (todasSelecionadas) {
      setConfigs(prev => ({
        ...prev,
        ufsPriorizadas: prev.ufsPriorizadas.filter(uf => !ufsRegiao.includes(uf))
      }));
    } else {
      setConfigs(prev => ({
        ...prev,
        ufsPriorizadas: [...new Set([...prev.ufsPriorizadas, ...ufsRegiao])]
      }));
    }
  };

  const handleSelectAll = () => {
    setConfigs(prev => ({
      ...prev,
      ufsPriorizadas: TODOS_ESTADOS.map(e => e.uf)
    }));
  };

  const handleClearAll = () => {
    setConfigs(prev => ({
      ...prev,
      ufsPriorizadas: []
    }));
  };

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
      ufs_priorizadas: configs.ufsPriorizadas,
    });
  };

  return (
    <MainLayout title="Configurações">
      <div className="max-w-4xl space-y-8">
        {/* Estados Prioritários */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Estados Prioritários para Captação</h3>
              <p className="text-sm text-muted-foreground">Selecione os estados onde deseja participar de licitações</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {configs.ufsPriorizadas.length} selecionados
            </Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Selecionar Todos
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Limpar Seleção
            </Button>
          </div>

          <div className="space-y-4">
            {REGIOES.map(regiao => {
              const estadosRegiao = TODOS_ESTADOS.filter(e => e.regiao === regiao);
              const selecionados = estadosRegiao.filter(e => configs.ufsPriorizadas.includes(e.uf)).length;
              const todosRegiao = selecionados === estadosRegiao.length;
              
              return (
                <div key={regiao} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={todosRegiao}
                      onCheckedChange={() => handleToggleRegiao(regiao)}
                    />
                    <span className="font-medium text-sm">{regiao}</span>
                    <Badge variant="secondary" className="text-xs">
                      {selecionados}/{estadosRegiao.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-6">
                    {estadosRegiao.map(estado => (
                      <Badge
                        key={estado.uf}
                        variant={configs.ufsPriorizadas.includes(estado.uf) ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          configs.ufsPriorizadas.includes(estado.uf) 
                            ? 'bg-primary hover:bg-primary/80' 
                            : 'hover:bg-primary/20'
                        }`}
                        onClick={() => handleToggleUF(estado.uf)}
                      >
                        {estado.uf}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
              <h3 className="font-semibold">Automação 24/7</h3>
              <p className="text-sm text-muted-foreground">Configure o comportamento automático do sistema</p>
            </div>
            {configs.captacaoContinua && (
              <Badge className="bg-success/20 text-success ml-auto animate-pulse">
                <Globe className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Captação Contínua 24/7</p>
                <p className="text-sm text-muted-foreground">Buscar novas licitações automaticamente a cada hora</p>
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