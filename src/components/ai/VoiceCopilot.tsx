import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, X, Bot, Loader2, 
  Sparkles, Send, Square 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const VoiceCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Eu sou seu Gerente Digital, seu especialista em licitações. Toque no microfone e me pergunte qualquer coisa — eu ouço, entendo e respondo em voz alta pra você. Pode falar!'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isListening, transcript, startListening, stopListening, isSupported, error: speechError } = useSpeechRecognition();
  const lastTranscriptRef = useRef('');

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When speech recognition finalizes, auto-send
  useEffect(() => {
    if (!isListening && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      sendMessage(transcript);
    }
  }, [isListening, transcript]);

  // Show speech recognition errors
  useEffect(() => {
    if (speechError) {
      toast.error(speechError);
    }
  }, [speechError]);

  const speakText = useCallback(async (text: string) => {
    if (!autoSpeak) return;
    setIsSpeaking(true);

    // Always try browser TTS first for reliability, then upgrade to ElevenLabs
    const useBrowserTTS = (textToSpeak: string) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
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

      if (!response.ok) {
        console.warn('ElevenLabs TTS failed, using browser voice:', response.status);
        useBrowserTTS(text);
        return;
      }

      const data = await response.json();
      if (data.audioContent) {
        if (audioRef.current) audioRef.current.pause();
        
        audioRef.current = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => {
          console.warn('Audio playback failed, using browser voice');
          useBrowserTTS(text);
        };
        await audioRef.current.play();
      } else {
        useBrowserTTS(text);
      }
    } catch (err) {
      console.warn('TTS error, using browser voice:', err);
      useBrowserTTS(text);
    }
  }, [autoSpeak]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const assistantContent = data.content || 'Desculpe, não entendi. Pode repetir?';
      const assistantMessage: Message = { role: 'assistant', content: assistantContent };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response
      await speakText(assistantContent);

    } catch (error: any) {
      console.error('Copilot error:', error);
      
      const errorMsg = 'Desculpe, tive um problema. Tente falar novamente.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      
      if (error.message?.includes('429')) {
        toast.error('Muitas requisições. Aguarde um momento.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos insuficientes.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const quickVoiceActions = [
    'Quais licitações novas tem pra mim?',
    'Como tá minha posição nas disputas?',
    'O que é SICAF?',
    'Me ajuda a entender dispensa com disputa',
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-2xl",
          "bg-gradient-to-br from-primary via-primary/90 to-accent hover:scale-110",
          "transition-all duration-300 group"
        )}
        aria-label="Abrir copiloto de voz"
      >
        <div className="relative">
          <Mic className="w-7 h-7 text-primary-foreground group-hover:scale-110 transition-transform" />
          <Sparkles className="w-3 h-3 text-primary-foreground absolute -top-1 -right-1 animate-pulse" />
        </div>
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[650px] max-h-[calc(100vh-4rem)] bg-background border-2 border-primary/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-accent p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            {(isListening || isSpeaking) && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-primary animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-primary-foreground text-base">Gerente Digital</h3>
            <p className="text-xs text-primary-foreground/70">
              {isListening ? '🎤 Te ouvindo...' : isSpeaking ? '🔊 Respondendo...' : isLoading ? '🧠 Pensando...' : '✨ Toque no microfone'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoSpeak(!autoSpeak)}
            className="text-primary-foreground hover:bg-white/20 h-8 w-8"
            title={autoSpeak ? 'Desativar voz' : 'Ativar voz'}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { stopSpeaking(); setIsOpen(false); }}
            className="text-primary-foreground hover:bg-white/20 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2.5",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}

          {/* Live transcript */}
          {isListening && transcript && (
            <div className="flex gap-2.5 justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-primary/10 text-primary border border-primary/20 rounded-br-md italic">
                <p>{transcript}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                <Mic className="w-4 h-4 text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {messages.length <= 2 && !isLoading && !isListening && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground text-center">Toque para perguntar ou fale:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickVoiceActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-full"
                  onClick={() => sendMessage(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Voice Control Footer */}
      <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
        {/* Main mic button */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            {isSpeaking && (
              <Button
                variant="outline"
                size="icon"
                onClick={stopSpeaking}
                className="h-10 w-10 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
                title="Parar de falar"
              >
                <Square className="w-4 h-4" />
              </Button>
            )}

            <button
              onClick={handleMicToggle}
              disabled={isLoading || !isSupported}
              className={cn(
                "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                "shadow-lg active:scale-95 disabled:opacity-50",
                isListening
                  ? "bg-destructive text-destructive-foreground shadow-destructive/30 scale-110"
                  : "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-primary/30 hover:scale-105"
              )}
              aria-label={isListening ? 'Parar de ouvir' : 'Começar a falar'}
            >
              {/* Pulse ring when listening */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
                  <span className="absolute inset-[-4px] rounded-full border-2 border-destructive/40 animate-pulse" />
                </>
              )}
              {isListening ? (
                <MicOff className="w-8 h-8 relative z-10" />
              ) : (
                <Mic className="w-8 h-8 relative z-10" />
              )}
            </button>

            {isSpeaking && <div className="w-10" />}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {!isSupported 
              ? 'Navegador não suporta voz — use Chrome ou Edge'
              : isListening 
                ? 'Te ouvindo... pode falar!' 
                : isSpeaking 
                  ? 'Respondendo pra você...'
                  : isLoading 
                    ? 'Pensando na melhor resposta...'
                    : 'Toque no microfone e pergunte qualquer coisa'}
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          Gerente Digital • TenderAce PRO
        </p>
      </div>
    </div>
  );
};
