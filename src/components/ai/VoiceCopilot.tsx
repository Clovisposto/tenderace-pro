import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, X, Bot, Loader2, Volume2, VolumeX, Square, BellRing, ChevronDown, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { usePendingAlerts } from '@/hooks/usePendingAlerts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const VoiceCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(() => localStorage.getItem('copilotActive') !== 'false');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Estou aqui em segundo plano. Pode falar a qualquer momento — eu navego, informo e opero o sistema pra você.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { tryNavigate } = useVoiceNavigation();
  const { pendingCount, pendingAlerts } = usePendingAlerts();
  const lastTranscriptRef = useRef('');
  const lastAlertCountRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Auto-send when speech ends
  useEffect(() => {
    if (!isListening && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      handleUserInput(transcript);
    }
  }, [isListening, transcript]);

  // Auto-notify about pending authorizations
  useEffect(() => {
    if (!isActive || pendingCount === 0) return;
    if (pendingCount !== lastAlertCountRef.current && pendingCount > 0) {
      lastAlertCountRef.current = pendingCount;
      const msg = pendingCount === 1
        ? `Atenção, tem uma licitação nova aguardando sua autorização.`
        : `Atenção, tem ${pendingCount} licitações novas aguardando sua autorização.`;
      
      // Show toast notification (non-intrusive)
      toast.info(msg, {
        duration: 8000,
        action: {
          label: 'Ver',
          onClick: () => setIsOpen(true),
        },
      });

      // Speak if autoSpeak and panel is closed (background alert)
      if (autoSpeak && !isOpen) {
        speakText(msg);
      }
    }
  }, [pendingCount, isActive, autoSpeak, isOpen]);

  const speakText = useCallback(async (text: string) => {
    if (!autoSpeak) return;
    setIsSpeaking(true);
    const useBrowserTTS = (t: string) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'pt-BR'; u.rate = 1.0;
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
          body: JSON.stringify({ text: text.substring(0, 800), alertType: 'normal' }),
        }
      );
      if (!response.ok) { useBrowserTTS(text); return; }
      const data = await response.json();
      if (data.fallback || data.error) { useBrowserTTS(text); return; }
      if (data.audioContent) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => useBrowserTTS(text);
        await audioRef.current.play();
      } else useBrowserTTS(text);
    } catch { useBrowserTTS(text); }
  }, [autoSpeak]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const handleUserInput = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMessage]);

    // Try navigation first
    const { navigated, label } = tryNavigate(text);
    if (navigated) {
      const navMsg = `Pronto, abri ${label} pra você.`;
      setMessages(prev => [...prev, { role: 'assistant', content: navMsg }]);
      await speakText(navMsg);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })) }
      });
      if (error) throw error;
      const content = data.content || 'Desculpe, não entendi. Pode repetir?';
      setMessages(prev => [...prev, { role: 'assistant', content }]);
      const aiNavResult = tryNavigate(content);
      if (!aiNavResult.navigated) await speakText(content);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Tive um problema. Tente falar novamente.' }]);
    } finally { setIsLoading(false); }
  };

  const handleMicToggle = () => {
    if (isListening) stopListening();
    else { stopSpeaking(); startListening(); if (!isOpen) setIsOpen(true); }
  };

  const toggleActive = () => {
    const next = !isActive;
    setIsActive(next);
    localStorage.setItem('copilotActive', String(next));
    if (!next) { stopSpeaking(); setIsOpen(false); }
    toast(next ? 'Gerente Digital ativado' : 'Gerente Digital desativado');
  };

  // ============ INACTIVE STATE — invisible dot ============
  if (!isActive) {
    return (
      <button
        onClick={toggleActive}
        className="fixed bottom-3 right-3 z-50 w-6 h-6 rounded-full bg-muted/40 hover:bg-primary/20 flex items-center justify-center opacity-20 hover:opacity-100 transition-all duration-500"
        title="Ativar Gerente Digital"
      >
        <Power className="w-3 h-3 text-muted-foreground" />
      </button>
    );
  }

  // ============ ACTIVE BUT HIDDEN — tiny floating indicator ============
  if (!isOpen) {
    return (
      <div className="fixed bottom-3 right-3 z-50 flex items-center">
        {/* Mic shortcut — always accessible */}
        <button
          onClick={handleMicToggle}
          disabled={!isSupported}
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-300",
            isListening
              ? "bg-destructive text-destructive-foreground scale-110"
              : "bg-primary/80 hover:bg-primary text-primary-foreground hover:scale-105",
            "backdrop-blur-sm"
          )}
          title={isListening ? 'Parar' : 'Falar com IA'}
        >
          {isListening && <span className="absolute w-9 h-9 rounded-full bg-destructive/30 animate-ping" />}
          {isListening ? <MicOff className="w-3.5 h-3.5 relative z-10" /> : <Mic className="w-3.5 h-3.5 relative z-10" />}
        </button>

        {/* Pending badge */}
        {pendingCount > 0 && (
          <button
            onClick={() => setIsOpen(true)}
            className="ml-1 relative"
            title={`${pendingCount} licitações aguardando`}
          >
            <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5 py-0.5 animate-pulse cursor-pointer hover:scale-110 transition-transform">
              {pendingCount}
            </Badge>
          </button>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <button onClick={stopSpeaking} className="ml-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center" title="Parar fala">
            <Volume2 className="w-3 h-3 text-primary animate-pulse" />
          </button>
        )}

        {/* Expand chat */}
        <button
          onClick={() => setIsOpen(true)}
          className="ml-1 h-6 w-6 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center opacity-40 hover:opacity-100 transition-all"
          title="Abrir chat"
        >
          <Bot className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // ============ OPEN PANEL — compact chat ============
  return (
    <div className="fixed bottom-3 right-3 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] h-[460px] max-h-[calc(100vh-3rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="bg-primary px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-4 h-4 text-primary-foreground" />
            {(isListening || isSpeaking) && (
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <span className="font-semibold text-primary-foreground text-xs">Gerente Digital</span>
            <p className="text-[9px] text-primary-foreground/60 leading-none mt-0.5">
              {isListening ? '🎤 Te ouvindo...' : isSpeaking ? '🔊 Falando...' : isLoading ? '🧠 Pensando...' : '24h ativo'}
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-warning/90 text-warning-foreground text-[9px] px-1.5 py-0 h-4 ml-1">
              <BellRing className="w-2.5 h-2.5 mr-0.5" />
              {pendingCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setAutoSpeak(!autoSpeak)}
            className="text-primary-foreground hover:bg-white/20 h-6 w-6">
            {autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleActive}
            className="text-primary-foreground hover:bg-white/20 h-6 w-6" title="Desativar IA">
            <Power className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { stopSpeaking(); setIsOpen(false); }}
            className="text-primary-foreground hover:bg-white/20 h-6 w-6" title="Minimizar">
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2.5">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-2.5 h-2.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary text-secondary-foreground rounded-bl-sm'
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-2.5 h-2.5 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-[10px] text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}

          {isListening && transcript && (
            <div className="flex gap-2 justify-end">
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs bg-primary/10 text-primary border border-primary/20 rounded-br-sm italic">
                {transcript}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {messages.length <= 2 && !isLoading && !isListening && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[9px] text-muted-foreground text-center">Diga ou clique:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {['Abrir licitações', 'Minhas disputas', 'O que é SICAF?', 'Ver relatórios'].map((a, i) => (
                <button key={i} onClick={() => handleUserInput(a)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors">
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Mic control */}
      <div className="px-3 py-2.5 border-t flex items-center justify-center gap-3">
        {isSpeaking && (
          <Button variant="outline" size="icon" onClick={stopSpeaking}
            className="h-7 w-7 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10">
            <Square className="w-2.5 h-2.5" />
          </Button>
        )}
        <button
          onClick={handleMicToggle}
          disabled={isLoading || !isSupported}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            "active:scale-95 disabled:opacity-50",
            isListening
              ? "bg-destructive text-destructive-foreground scale-110"
              : "bg-primary text-primary-foreground hover:scale-105"
          )}
        >
          {isListening && <span className="absolute w-12 h-12 rounded-full bg-destructive/30 animate-ping" />}
          {isListening ? <MicOff className="w-5 h-5 relative z-10" /> : <Mic className="w-5 h-5 relative z-10" />}
        </button>
        {isSpeaking && <div className="w-7" />}
      </div>
    </div>
  );
};
