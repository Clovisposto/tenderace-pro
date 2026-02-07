import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2, X, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { usePendingAlerts } from '@/hooks/usePendingAlerts';

export const SmartCommandBar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedRef = useRef('');
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { tryNavigate } = useVoiceNavigation();
  const { pendingCount } = usePendingAlerts();

  // Auto-start listening when expanded
  useEffect(() => {
    if (isExpanded && isSupported && !isListening) {
      startListening();
    }
  }, [isExpanded]);

  // Process voice transcript automatically
  useEffect(() => {
    if (!transcript || transcript === lastProcessedRef.current || isLoading) return;
    const cleaned = transcript.toLowerCase().trim();
    if (cleaned.length < 3) return;

    lastProcessedRef.current = transcript;
    setTimeout(() => { lastProcessedRef.current = ''; }, 3000);

    processCommand(cleaned);
  }, [transcript]);

  // Show response with auto-hide
  const showResponseText = (text: string) => {
    setLastResponse(text);
    setShowResponse(true);
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    responseTimerRef.current = setTimeout(() => setShowResponse(false), 8000);
  };

  // ========== TTS ==========
  const speakText = useCallback(async (text: string) => {
    setIsSpeaking(true);
    const useBrowserTTS = (t: string) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'pt-BR';
        u.rate = 0.95;
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
      } else setIsSpeaking(false);
    };

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
          body: JSON.stringify({ text: text.substring(0, 500), alertType: 'normal' }),
        }
      );
      if (!response.ok) { useBrowserTTS(text); return; }
      const data = await response.json();
      if (data.audioContent) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => useBrowserTTS(text);
        await audioRef.current.play();
      } else useBrowserTTS(text);
    } catch { useBrowserTTS(text); }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // ========== COMMAND PROCESSING ==========
  const processCommand = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const clean = text.trim();

    // 1) NAVIGATION — instant
    const { navigated, label } = tryNavigate(clean);
    if (navigated) {
      const msg = `${label} aberto.`;
      showResponseText(msg);
      speakText(msg);
      return;
    }

    // 2) DIRECT ACTIONS — instant
    const actionResponse = await executeAction(clean);
    if (actionResponse) {
      showResponseText(actionResponse);
      speakText(actionResponse);
      return;
    }

    // 3) QUICK RESPONSES — instant
    const quickResponse = getQuickResponse(clean);
    if (quickResponse) {
      showResponseText(quickResponse);
      speakText(quickResponse);
      return;
    }

    // 4) AI — complex questions
    setIsLoading(true);
    showResponseText('Processando...');
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [
            { role: 'system', content: 'Você é o Gerente Digital do TenderAce PRO. Responda em NO MÁXIMO 2 frases curtas e objetivas. Tudo será lido em voz alta. Sem formatação, sem markdown, sem asteriscos. Fale de forma simples e clara.' },
            { role: 'user', content: clean }
          ]
        }
      });
      if (error) throw error;
      const content = data.content || 'Comando processado.';
      showResponseText(content);
      speakText(content);
    } catch {
      const errMsg = 'Desculpe, houve um erro. Tente novamente.';
      showResponseText(errMsg);
      speakText(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct database actions
  const executeAction = async (text: string): Promise<string | null> => {
    const t = text.toLowerCase();

    if (t.includes('autoriza') || t.includes('participar') || t.includes('participa') || t.includes('pode participar')) {
      try {
        const { data: novas, error } = await supabase
          .from('licitacoes')
          .select('id')
          .eq('status', 'Nova')
          .order('valor', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (!novas || novas.length === 0) return 'Não tem licitação pendente no momento.';

        const { error: updateError } = await supabase
          .from('licitacoes')
          .update({ status: 'Autorizada' })
          .in('id', novas.map(l => l.id));

        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
        queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
        queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });

        toast.success(`${novas.length} licitações autorizadas`);
        return `Pronto! ${novas.length} licitações autorizadas. O robô já está monitorando.`;
      } catch {
        return 'Erro ao autorizar. Fale novamente.';
      }
    }

    if (t.includes('atualiza') || t.includes('refresh') || t.includes('recarrega')) {
      window.location.reload();
      return 'Atualizando o sistema.';
    }

    if (t.includes('silêncio') || t.includes('silencio') || t.includes('cala') || t.includes('para de falar') || t.includes('para')) {
      stopSpeaking();
      return 'Silenciado.';
    }

    return null;
  };

  // Quick responses without AI
  const getQuickResponse = (text: string): string | null => {
    const t = text.toLowerCase();
    if (t.includes('quantas') && t.includes('aguardando')) return `Tem ${pendingCount} licitações aguardando sua autorização.`;
    if (t.includes('quais') && t.includes('aguardando')) return `${pendingCount} licitações aguardando. Fale "autoriza tudo" para liberar.`;
    if (t.includes('status') || t.includes('situação') || t.includes('situacao')) return `Sistema funcionando. ${pendingCount} licitações pendentes.`;
    if (t.includes('obrigado') || t.includes('valeu')) return 'Às ordens!';
    if (t.includes('bom dia')) return 'Bom dia! Sistema funcionando perfeitamente.';
    if (t.includes('boa tarde')) return 'Boa tarde! Tudo sob controle.';
    if (t.includes('boa noite')) return 'Boa noite! Monitoramento ativo.';
    if (t.includes('ajuda') || t.includes('o que você faz') || t.includes('o que voce faz')) {
      return 'Eu sou seu assistente. Fale: abre licitações, autoriza tudo, quantas aguardando, abre medicamentos, abre relatórios. Posso fazer tudo por voz!';
    }
    return null;
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleOpen = () => {
    setIsExpanded(true);
  };

  // ============ MINIMIZED STATE — big, accessible button ============
  if (!isExpanded) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {/* Pending badge */}
        {pendingCount > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-warning text-warning-foreground text-sm font-bold animate-pulse shadow-md">
            {pendingCount} aguardando
          </div>
        )}

        {/* Main button — large and accessible */}
        <button
          onClick={handleOpen}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95",
            "bg-primary text-primary-foreground",
            isListening && "ring-4 ring-green-500/50"
          )}
          aria-label="Abrir assistente de voz"
        >
          <Mic className="w-7 h-7" />
        </button>
      </div>
    );
  }

  // ============ EXPANDED — Voice-first copilot ============
  return (
    <>
      {/* Response overlay — shows AI response at top, doesn't block system */}
      {showResponse && lastResponse && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl px-5 py-4 flex items-start gap-3">
            {isSpeaking && (
              <div className="shrink-0 mt-0.5">
                <Volume2 className="w-5 h-5 text-primary animate-pulse" />
              </div>
            )}
            {isLoading && (
              <div className="shrink-0 mt-0.5">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}
            <p className="text-sm text-foreground leading-relaxed flex-1">{lastResponse}</p>
            <button onClick={() => setShowResponse(false)} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Voice control bar — bottom, compact */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-xl animate-in slide-in-from-bottom-2 duration-200">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-4 px-4 py-3">
          {/* Stop speaking */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-95"
              aria-label="Parar de falar"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}

          {/* Main mic button — LARGE */}
          <button
            onClick={toggleMic}
            disabled={isLoading}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95 disabled:opacity-50",
              isListening
                ? "bg-green-500 text-white ring-4 ring-green-500/30"
                : "bg-primary text-primary-foreground hover:scale-105"
            )}
            aria-label={isListening ? 'Parar de ouvir' : 'Começar a ouvir'}
          >
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : isListening ? (
              <>
                <span className="absolute w-16 h-16 rounded-full bg-green-500/20 animate-ping" />
                <Mic className="w-7 h-7 relative z-10" />
              </>
            ) : (
              <MicOff className="w-7 h-7" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={() => { stopSpeaking(); stopListening(); setIsExpanded(false); }}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 transition-all active:scale-95"
            aria-label="Fechar assistente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status text */}
        <div className="text-center pb-3">
          {isListening && transcript ? (
            <p className="text-sm text-primary font-medium px-4 truncate">🎤 {transcript}</p>
          ) : isListening ? (
            <p className="text-xs text-muted-foreground">🎤 Ouvindo... fale seu comando</p>
          ) : isLoading ? (
            <p className="text-xs text-muted-foreground">🧠 Processando...</p>
          ) : (
            <p className="text-xs text-muted-foreground">Toque no microfone e fale seu comando</p>
          )}
        </div>
      </div>
    </>
  );
};
