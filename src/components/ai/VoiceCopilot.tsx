import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, X, Bot, Loader2, Volume2, VolumeX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const VoiceCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('copilotActive') !== 'false';
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Gerente Digital ativo. Toque no microfone e fale o que precisa — eu navego, explico e opero o sistema pra você.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { tryNavigate } = useVoiceNavigation();
  const lastTranscriptRef = useRef('');

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

  const speakText = useCallback(async (text: string) => {
    if (!autoSpeak) return;
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
      } else {
        setIsSpeaking(false);
      }
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
      if (data.audioContent) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => useBrowserTTS(text);
        await audioRef.current.play();
      } else {
        useBrowserTTS(text);
      }
    } catch {
      useBrowserTTS(text);
    }
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
      const navMsg = `Pronto, abri a página de ${label} pra você.`;
      setMessages(prev => [...prev, { role: 'assistant', content: navMsg }]);
      await speakText(navMsg);
      return;
    }

    // Send to AI
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
        }
      });
      if (error) throw error;

      const content = data.content || 'Desculpe, não entendi. Pode repetir?';
      setMessages(prev => [...prev, { role: 'assistant', content }]);

      // Check if AI response contains navigation hints
      const aiNavResult = tryNavigate(content);
      if (!aiNavResult.navigated) {
        await speakText(content);
      }
    } catch {
      const errMsg = 'Tive um problema. Tente falar novamente.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicToggle = () => {
    if (isListening) stopListening();
    else { stopSpeaking(); startListening(); }
  };

  const toggleActive = () => {
    const next = !isActive;
    setIsActive(next);
    localStorage.setItem('copilotActive', String(next));
    if (!next) { stopSpeaking(); setIsOpen(false); }
    toast(next ? 'Gerente Digital ativado' : 'Gerente Digital desativado');
  };

  // Inactive: show nothing
  if (!isActive) {
    return (
      <button
        onClick={toggleActive}
        className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full bg-muted/60 hover:bg-muted border border-border/50 flex items-center justify-center opacity-40 hover:opacity-100 transition-all duration-300"
        title="Ativar Gerente Digital"
      >
        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    );
  }

  // Active but closed: small subtle pill
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1">
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-10 px-3 rounded-full flex items-center gap-2 shadow-md transition-all duration-300",
            "bg-primary/90 hover:bg-primary text-primary-foreground hover:scale-105",
            "backdrop-blur-sm border border-primary/20"
          )}
          title="Abrir Gerente Digital"
        >
          <div className="relative">
            <Mic className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-medium hidden sm:inline">IA</span>
        </button>
        <button
          onClick={toggleActive}
          className="h-6 w-6 rounded-full bg-muted/80 hover:bg-destructive/20 flex items-center justify-center transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
          title="Desativar"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Open panel — compact
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-4rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header — compact */}
      <div className="bg-primary px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-5 h-5 text-primary-foreground" />
            {(isListening || isSpeaking) && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <span className="font-semibold text-primary-foreground text-sm">Gerente Digital</span>
            <p className="text-[10px] text-primary-foreground/60 leading-none mt-0.5">
              {isListening ? '🎤 Ouvindo...' : isSpeaking ? '🔊 Falando...' : isLoading ? '🧠 Pensando...' : '24h ativo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setAutoSpeak(!autoSpeak)}
            className="text-primary-foreground hover:bg-white/20 h-7 w-7">
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { stopSpeaking(); setIsOpen(false); }}
            className="text-primary-foreground hover:bg-white/20 h-7 w-7">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed",
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
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}

          {isListening && transcript && (
            <div className="flex gap-2 justify-end">
              <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-primary/10 text-primary border border-primary/20 rounded-br-sm italic">
                {transcript}
              </div>
            </div>
          )}
        </div>

        {/* Quick nav hints */}
        {messages.length <= 2 && !isLoading && !isListening && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] text-muted-foreground text-center">Diga por exemplo:</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['Abrir licitações', 'Ver medicamentos', 'O que é SICAF?', 'Minhas disputas'].map((a, i) => (
                <button key={i} onClick={() => handleUserInput(a)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:bg-muted transition-colors">
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Mic control — minimal */}
      <div className="px-3 py-3 border-t flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          {isSpeaking && (
            <Button variant="outline" size="icon" onClick={stopSpeaking}
              className="h-8 w-8 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10">
              <Square className="w-3 h-3" />
            </Button>
          )}
          <button
            onClick={handleMicToggle}
            disabled={isLoading || !isSupported}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
              "active:scale-95 disabled:opacity-50",
              isListening
                ? "bg-destructive text-destructive-foreground scale-110"
                : "bg-primary text-primary-foreground hover:scale-105"
            )}
          >
            {isListening && <span className="absolute w-14 h-14 rounded-full bg-destructive/30 animate-ping" />}
            {isListening ? <MicOff className="w-6 h-6 relative z-10" /> : <Mic className="w-6 h-6 relative z-10" />}
          </button>
          {isSpeaking && <div className="w-8" />}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {!isSupported ? 'Use Chrome ou Edge' : isListening ? 'Ouvindo...' : 'Toque e fale'}
        </p>
      </div>
    </div>
  );
};
