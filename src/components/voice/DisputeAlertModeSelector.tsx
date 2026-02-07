import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Mic, Volume2, Check } from 'lucide-react';
import { useVoiceAlerts } from '@/hooks/useVoiceAlerts';
import { toast } from 'sonner';

export type DisputeAlertMode = 'off' | 'beep' | 'voice';

interface DisputeAlertModeSelectorProps {
  className?: string;
}

export function DisputeAlertModeSelector({ className }: DisputeAlertModeSelectorProps) {
  const [mode, setMode] = useState<DisputeAlertMode>(() => {
    return (localStorage.getItem('disputeAlertMode') as DisputeAlertMode) || 'beep';
  });

  const { playAlarmSound, speakAlert, isSpeaking } = useVoiceAlerts();

  const handleModeChange = useCallback((newMode: DisputeAlertMode) => {
    setMode(newMode);
    localStorage.setItem('disputeAlertMode', newMode);

    if (newMode === 'off') {
      toast.info('Alertas de disputa desligados');
    } else if (newMode === 'beep') {
      toast.success('Modo apito ativado');
      playAlarmSound();
    } else {
      toast.success('Modo voz IA ativado');
      speakAlert('Modo de voz ativado. Você será informado sobre mudanças nas disputas.', {
        alertType: 'normal',
      });
    }
  }, [playAlarmSound, speakAlert]);

  const modes = [
    {
      id: 'off' as const,
      label: 'Desligado',
      icon: BellOff,
      description: 'Sem alertas sonoros',
      color: 'text-muted-foreground',
      activeBg: 'bg-muted border-muted-foreground/30',
    },
    {
      id: 'beep' as const,
      label: 'Apito',
      icon: Bell,
      description: 'Beep sonoro nas mudanças',
      color: 'text-amber-600',
      activeBg: 'bg-amber-500/10 border-amber-500',
    },
    {
      id: 'voice' as const,
      label: 'Voz IA',
      icon: Mic,
      description: 'Narração por voz da situação',
      color: 'text-primary',
      activeBg: 'bg-primary/10 border-primary',
    },
  ];

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-sm">Alerta de Disputa</h4>
          </div>
          <Badge
            variant="outline"
            className={`text-xs ${
              mode === 'off'
                ? 'text-muted-foreground'
                : mode === 'beep'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                : 'bg-primary/10 text-primary border-primary/30'
            }`}
          >
            {mode === 'off' ? 'Desligado' : mode === 'beep' ? '🔔 Apito' : '🎙️ Voz IA'}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {modes.map((m) => {
            const isActive = mode === m.id;
            const Icon = m.icon;
            return (
              <Button
                key={m.id}
                variant="outline"
                size="sm"
                disabled={m.id === 'voice' && isSpeaking}
                className={`flex flex-col items-center gap-1 h-auto py-3 transition-all ${
                  isActive
                    ? `${m.activeBg} border-2 shadow-sm`
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleModeChange(m.id)}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? m.color : 'text-muted-foreground'}`} />
                  {isActive && (
                    <Check className="w-3 h-3 text-white bg-primary rounded-full p-0.5 absolute -top-1 -right-2" />
                  )}
                </div>
                <span className={`text-xs font-medium ${isActive ? m.color : 'text-muted-foreground'}`}>
                  {m.label}
                </span>
              </Button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          {mode === 'off'
            ? 'Nenhum alerta será emitido durante as disputas'
            : mode === 'beep'
            ? 'Um apito sonoro será emitido quando houver mudanças de posição'
            : 'A IA narrará em voz alta cada mudança de posição nas disputas 24h'}
        </p>
      </CardContent>
    </Card>
  );
}
