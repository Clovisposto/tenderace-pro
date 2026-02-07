import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, Loader2, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { usePendingAlerts } from '@/hooks/usePendingAlerts';

export const SmartCommandBar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedRef = useRef('');
  const queryClient = useQueryClient();

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { tryNavigate } = useVoiceNavigation();
  const { pendingCount } = usePendingAlerts();

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) inputRef.current.focus();
  }, [isExpanded]);

  // Process voice transcript
  useEffect(() => {
    if (!transcript || transcript === lastProcessedRef.current || isLoading) return;
    const cleaned = transcript.toLowerCase().trim();
    if (cleaned.length < 3) return;

    lastProcessedRef.current = transcript;
    setTimeout(() => { lastProcessedRef.current = ''; }, 3000);

    if (!isExpanded) setIsExpanded(true);
    processCommand(cleaned);
  }, [transcript]);

  // ========== TTS ==========
  const speakText = useCallback(async (text: string) => {
    setIsSpeaking(true);
    const useBrowserTTS = (t: string) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'pt-BR';
        u.rate = 1.0;
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
    setInput('');

    // 1) NAVIGATION — instant
    const { navigated, label } = tryNavigate(clean);
    if (navigated) {
      const msg = `✅ ${label} aberto.`;
      toast.success(msg, { duration: 4000 });
      speakText(msg);
      return;
    }

    // 2) DIRECT ACTIONS — instant
    const actionResponse = await executeAction(clean);
    if (actionResponse) {
      toast.success(actionResponse, { duration: 5000 });
      speakText(actionResponse);
      return;
    }

    // 3) QUICK RESPONSES — instant
    const quickResponse = getQuickResponse(clean);
    if (quickResponse) {
      toast.info(quickResponse, { duration: 5000 });
      speakText(quickResponse);
      return;
    }

    // 4) AI — complex questions
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [
            { role: 'system', content: 'Você é o Gerente Digital do TenderAce PRO. Responda em NO MÁXIMO 2 frases curtas e objetivas. Sem perguntas. Execute.' },
            { role: 'user', content: clean }
          ]
        }
      });
      if (error) throw error;
      const content = data.content || 'Comando processado.';
      toast.info(content, { duration: 6000 });
      speakText(content);
    } catch {
      toast.error('Erro ao processar. Tente novamente.');
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
        if (!novas || novas.length === 0) return 'Não há licitações pendentes de autorização.';

        const { error: updateError } = await supabase
          .from('licitacoes')
          .update({ status: 'Autorizada' })
          .in('id', novas.map(l => l.id));

        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
        queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
        queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });

        return `${novas.length} licitações autorizadas com sucesso. Robô monitorando.`;
      } catch {
        return 'Erro ao autorizar. Tente novamente.';
      }
    }

    if (t.includes('atualiza') || t.includes('refresh') || t.includes('recarrega')) {
      window.location.reload();
      return 'Atualizando o sistema.';
    }

    if (t.includes('silêncio') || t.includes('silencio') || t.includes('cala') || t.includes('para de falar')) {
      stopSpeaking();
      return 'Silenciado.';
    }

    return null;
  };

  // Quick responses without AI
  const getQuickResponse = (text: string): string | null => {
    const t = text.toLowerCase();
    if (t.includes('quantas') && t.includes('aguardando')) return `${pendingCount} licitações aguardando autorização.`;
    if (t.includes('quais') && t.includes('aguardando')) return `${pendingCount} licitações aguardando. Diga "autoriza tudo" para liberar.`;
    if (t.includes('status') || t.includes('situação') || t.includes('situacao')) return `Sistema operacional. ${pendingCount} licitações pendentes.`;
    if (t.includes('obrigado') || t.includes('valeu')) return 'Às ordens!';
    if (t.includes('bom dia')) return 'Bom dia! Sistema operacional.';
    if (t.includes('boa tarde')) return 'Boa tarde! Tudo sob controle.';
    if (t.includes('boa noite')) return 'Boa noite! Monitoramento ativo.';
    return null;
  };

  const handleSubmit = () => processCommand(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') setIsExpanded(false);
  };

  // ============ MINIMIZED STATE ============
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        {isListening && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-primary font-medium">Ouvindo...</span>
          </div>
        )}
        {pendingCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground font-bold animate-pulse">
            {pendingCount}
          </span>
        )}
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110",
            "bg-primary text-primary-foreground",
            isListening && "ring-2 ring-green-500/50"
          )}
          title="Abrir comando"
        >
          <Bot className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // ============ EXPANDED COMMAND BAR ============
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-lg animate-in slide-in-from-bottom-2 duration-200">
      <div className="max-w-4xl mx-auto flex items-center gap-2 px-4 py-2">
        {/* Mic Button */}
        {isSupported && (
          <Button
            variant={isListening ? 'default' : 'outline'}
            size="icon"
            onClick={() => isListening ? stopListening() : startListening()}
            disabled={isLoading}
            className={cn(
              "shrink-0 h-9 w-9 rounded-full transition-all",
              isListening && "bg-green-500 hover:bg-green-600 ring-2 ring-green-500/30"
            )}
            title={isListening ? 'Parar microfone' : 'Ativar microfone'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        )}

        {/* Input */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎤 Ouvindo... fale seu comando' : 'Digite seu comando...'}
            disabled={isLoading}
            className="h-9 text-sm pr-10"
          />
          {isListening && transcript && (
            <span className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-primary italic truncate max-w-[200px]">
              {transcript}
            </span>
          )}
        </div>

        {/* Send */}
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          size="icon"
          className="shrink-0 h-9 w-9 rounded-full"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>

        {/* Status indicators */}
        {isSpeaking && (
          <Button
            variant="ghost"
            size="icon"
            onClick={stopSpeaking}
            className="shrink-0 h-9 w-9 rounded-full text-destructive"
            title="Parar fala"
          >
            <span className="text-xs">🔊</span>
          </Button>
        )}

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { stopSpeaking(); setIsExpanded(false); }}
          className="shrink-0 h-9 w-9 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
