import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface VoiceAlertOptions {
  alertType?: 'normal' | 'urgent' | 'victory' | 'defeat';
  volume?: number;
}

interface UseVoiceAlertsReturn {
  speakAlert: (text: string, options?: VoiceAlertOptions) => Promise<void>;
  speakPosition: (position: number, totalCompetitors: number, licitacaoName?: string) => Promise<void>;
  speakCalled: (licitacaoName?: string) => Promise<void>;
  speakVictory: (licitacaoName?: string, valor?: number) => Promise<void>;
  speakDefeat: (licitacaoName?: string) => Promise<void>;
  playAlarmSound: () => void;
  isSpeaking: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useVoiceAlerts = (): UseVoiceAlertsReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('voiceAlertsEnabled');
    return saved !== 'false';
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  const playAlarmSound = useCallback(() => {
    if (!isEnabled) return;
    
    // Create alarm beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for alarm beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, audioContext.currentTime);
        gain2.gain.setValueAtTime(0.5, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 300);
      
      // Third beep
      setTimeout(() => {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(1320, audioContext.currentTime);
        gain3.gain.setValueAtTime(0.6, audioContext.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.8);
      }, 600);
      
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }, [isEnabled]);

  const speakAlert = useCallback(async (text: string, options: VoiceAlertOptions = {}) => {
    if (!isEnabled) {
      console.log('Voice alerts disabled');
      return;
    }

    const { alertType = 'normal', volume = 1.0 } = options;

    setIsSpeaking(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text, 
            alertType,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.audioContent) {
        // Use data URI for base64 audio
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.volume = volume;
        
        audioRef.current.onended = () => {
          setIsSpeaking(false);
        };
        
        audioRef.current.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsSpeaking(false);
        };
        
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Voice alert error:', error);
      setIsSpeaking(false);
      
      // Fallback to browser TTS if ElevenLabs fails
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = alertType === 'urgent' ? 1.2 : 1.0;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [isEnabled]);

  const speakPosition = useCallback(async (position: number, totalCompetitors: number, licitacaoName?: string) => {
    const positionText = position === 1 
      ? "Estamos em primeiro lugar!" 
      : `Estamos em ${position}º lugar de ${totalCompetitors} competidores.`;
    
    const fullText = licitacaoName 
      ? `${licitacaoName}. ${positionText}`
      : positionText;
    
    await speakAlert(fullText, { 
      alertType: position === 1 ? 'victory' : position <= 3 ? 'normal' : 'urgent' 
    });
  }, [speakAlert]);

  const speakCalled = useCallback(async (licitacaoName?: string) => {
    playAlarmSound();
    
    setTimeout(async () => {
      const text = licitacaoName 
        ? `Atenção! Estamos sendo chamados na licitação ${licitacaoName}. Ação necessária imediatamente!`
        : "Atenção! Estamos sendo chamados para disputa. Ação necessária imediatamente!";
      
      await speakAlert(text, { alertType: 'urgent' });
    }, 1000);
  }, [speakAlert, playAlarmSound]);

  const speakVictory = useCallback(async (licitacaoName?: string, valor?: number) => {
    const valorText = valor ? ` no valor de ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '';
    const text = licitacaoName 
      ? `Parabéns! Vencemos a licitação ${licitacaoName}${valorText}!`
      : `Parabéns! Vencemos a licitação${valorText}!`;
    
    await speakAlert(text, { alertType: 'victory' });
    toast.success('🎉 Vitória!', { description: text });
  }, [speakAlert]);

  const speakDefeat = useCallback(async (licitacaoName?: string) => {
    const text = licitacaoName 
      ? `Infelizmente perdemos a licitação ${licitacaoName}.`
      : "Infelizmente perdemos a licitação.";
    
    await speakAlert(text, { alertType: 'defeat' });
  }, [speakAlert]);

  const handleSetEnabled = useCallback((enabled: boolean) => {
    setEnabled(enabled);
    localStorage.setItem('voiceAlertsEnabled', String(enabled));
    
    if (enabled) {
      toast.success('Alertas de voz ativados');
    } else {
      toast.info('Alertas de voz desativados');
    }
  }, []);

  return {
    speakAlert,
    speakPosition,
    speakCalled,
    speakVictory,
    speakDefeat,
    playAlarmSound,
    isSpeaking,
    isEnabled,
    setEnabled: handleSetEnabled,
  };
};
