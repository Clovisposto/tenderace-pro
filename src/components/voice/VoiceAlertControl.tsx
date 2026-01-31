import React from 'react';
import { Volume2, VolumeX, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useVoiceAlerts } from '@/hooks/useVoiceAlerts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

export const VoiceAlertControl: React.FC = () => {
  const { isEnabled, setEnabled, isSpeaking, speakAlert, playAlarmSound } = useVoiceAlerts();

  const testVoiceAlert = async () => {
    toast.info('Testando alerta de voz...');
    await speakAlert('Sistema de alertas de voz ativado. Você será notificado sobre mudanças de posição nas disputas.', {
      alertType: 'normal',
    });
  };

  const testAlarmSound = () => {
    playAlarmSound();
    toast.info('Testando alarme sonoro');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${isSpeaking ? 'animate-pulse text-primary' : ''}`}
        >
          {isEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          )}
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-medium text-sm">Alertas de Voz</h4>
              <p className="text-xs text-muted-foreground">
                Notificações sonoras em disputas
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {isEnabled && (
            <>
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  O sistema avisará:
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Sua posição atual na disputa
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    Quando você for chamado para lance
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Quando vencer uma licitação
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Quando perder uma licitação
                  </li>
                </ul>
              </div>

              <div className="border-t pt-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={testVoiceAlert}
                  disabled={isSpeaking}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  {isSpeaking ? 'Falando...' : 'Testar Voz'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={testAlarmSound}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Testar Alarme
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
