import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Bot,
  Zap,
  Shield,
  Target,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Clock,
  Power,
  Settings2,
  KeyRound,
  WifiOff,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface RoboActivationPanelProps {
  licitacaoId: string;
  empresaId: string;
  propostaId?: string;
  valorProposta: number;
  licitacaoNumero: string;
}

export function RoboActivationPanel({
  licitacaoId,
  empresaId,
  propostaId,
  valorProposta,
  licitacaoNumero,
}: RoboActivationPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing config
  const { data: config, isLoading } = useQuery({
    queryKey: ['robo-config', licitacaoId, empresaId],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('robo_configuracao' as any)
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .eq('empresa_id', empresaId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!licitacaoId && !!empresaId,
  });

  // Check if certificate exists
  const { data: hasCert } = useQuery({
    queryKey: ['has-cert', empresaId],
    queryFn: async () => {
      if (!user) return false;
      const path = `${user.id}/${empresaId}/`;
      const { data } = await supabase.storage.from('certificados-digitais').list(path);
      return data?.some(f => f.name.endsWith('.pfx') || f.name.endsWith('.p12')) ?? false;
    },
    enabled: !!user && !!empresaId,
  });

  const [ativo, setAtivo] = useState(false);
  const [margemMinima, setMargemMinima] = useState(8);
  const [valorMinimo, setValorMinimo] = useState(0);
  const [lanceAgressivo, setLanceAgressivo] = useState(false);

  useEffect(() => {
    if (config) {
      setAtivo(config.ativo ?? false);
      setMargemMinima(config.margem_minima ?? 8);
      setValorMinimo(config.valor_minimo ?? 0);
      setLanceAgressivo(config.lance_agressivo ?? false);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (newAtivo: boolean) => {
      if (!user) throw new Error('Não autenticado');

      const payload = {
        user_id: user.id,
        empresa_id: empresaId,
        licitacao_id: licitacaoId,
        proposta_id: propostaId || null,
        ativo: newAtivo,
        margem_minima: margemMinima,
        valor_minimo: valorMinimo,
        lance_agressivo: lanceAgressivo,
        certificado_path: `${user.id}/${empresaId}/`,
        status: newAtivo ? 'aguardando' : 'aguardando',
      };

      if (config?.id) {
        const { error } = await supabase
          .from('robo_configuracao' as any)
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('robo_configuracao' as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robo-config', licitacaoId, empresaId] });
      toast({
        title: ativo ? '🤖 Robô ativado!' : 'Robô desativado',
        description: ativo ? 'O robô entrará na sala de disputa automaticamente.' : 'Automação pausada.',
      });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' });
    },
  });

  const handleToggle = (checked: boolean) => {
    if (checked && !hasCert) {
      toast({
        title: '⚠️ Certificado A1 necessário',
        description: 'Faça upload do certificado digital A1 na página de Empresas antes de ativar o robô.',
        variant: 'destructive',
      });
      return;
    }
    setAtivo(checked);
    saveMutation.mutate(checked);
  };

  const handleSaveSettings = () => {
    saveMutation.mutate(ativo);
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    aguardando: { label: 'Aguardando', color: 'bg-muted text-muted-foreground', icon: <Clock className="w-3 h-3" /> },
    conectando: { label: 'Conectando...', color: 'bg-amber-500/10 text-amber-600', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    na_sala: { label: 'Na Sala', color: 'bg-blue-500/10 text-blue-600', icon: <Activity className="w-3 h-3" /> },
    disputando: { label: 'Disputando', color: 'bg-success/10 text-success', icon: <Zap className="w-3 h-3 animate-pulse" /> },
    finalizado: { label: 'Finalizado', color: 'bg-muted text-muted-foreground', icon: <CheckCircle2 className="w-3 h-3" /> },
    erro: { label: 'Erro', color: 'bg-destructive/10 text-destructive', icon: <AlertTriangle className="w-3 h-3" /> },
  };

  const currentStatus = statusConfig[config?.status || 'aguardando'] || statusConfig.aguardando;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 transition-all ${ativo ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-success/5' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Robô de Lances Automático
          </CardTitle>
          <div className="flex items-center gap-3">
            {config?.status && config.status !== 'aguardando' && (
              <Badge className={currentStatus.color}>
                {currentStatus.icon}
                <span className="ml-1">{currentStatus.label}</span>
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <Power className={`w-4 h-4 ${ativo ? 'text-success' : 'text-muted-foreground'}`} />
              <Switch checked={ativo} onCheckedChange={handleToggle} disabled={saveMutation.isPending} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Certificate status */}
        {!hasCert && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Certificado A1 não encontrado</p>
              <p className="text-xs text-muted-foreground">
                Vá em <strong>Empresas → Certificado → Upload A1</strong> para enviar o arquivo .pfx
              </p>
            </div>
          </div>
        )}

        {hasCert && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <p className="text-sm text-success font-medium">Certificado A1 disponível</p>
          </div>
        )}

        {/* Settings */}
        <div className={`space-y-4 ${!ativo ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                Margem Mínima de Lucro
              </span>
              <span className="text-primary font-bold">{margemMinima}%</span>
            </Label>
            <Slider
              value={[margemMinima]}
              onValueChange={([v]) => setMargemMinima(v)}
              min={1}
              max={30}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              O robô não dará lances abaixo de {margemMinima}% de margem sobre o custo.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              Valor Mínimo do Lance (R$)
            </Label>
            <Input
              type="number"
              value={valorMinimo}
              onChange={e => setValorMinimo(Number(e.target.value))}
              placeholder="0.00"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              O robô não dará lances abaixo deste valor absoluto.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              <div>
                <p className="text-sm font-medium">Modo Agressivo</p>
                <p className="text-xs text-muted-foreground">Lances mais frequentes e com menor margem</p>
              </div>
            </div>
            <Switch checked={lanceAgressivo} onCheckedChange={setLanceAgressivo} />
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saveMutation.isPending}
            className="w-full gap-2"
            variant="outline"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
            Salvar Configurações
          </Button>
        </div>

        {/* Error message */}
        {config?.erro_mensagem && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Erro do Robô</p>
                <p className="text-xs text-muted-foreground mt-0.5">{config.erro_mensagem}</p>
              </div>
            </div>
          </div>
        )}

        {/* Legal compliance */}
        <div className="p-2 rounded bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
          <Shield className="w-3 h-3 mt-0.5 shrink-0" />
          <p>
            <strong>Lei 14.133/2021:</strong> Lances automáticos em conformidade legal. 
            O robô requer autorização explícita e opera dentro dos limites configurados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
