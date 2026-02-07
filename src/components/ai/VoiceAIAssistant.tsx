import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { usePendingAlerts } from '@/hooks/usePendingAlerts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const VoiceAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o Gerente Digital do TenderAce PRO. Pode falar ou digitar — eu obedeço seus comandos sobre licitações, navegação e operações do sistema.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedRef = useRef('');
  const queryClient = useQueryClient();

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { tryNavigate } = useVoiceNavigation();
  const { pendingCount } = usePendingAlerts();

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  // Process voice transcript automatically
  useEffect(() => {
    if (!transcript || transcript === lastProcessedRef.current || isLoading) return;

    const cleaned = transcript.toLowerCase().trim();
    if (cleaned.length < 3) return;

    lastProcessedRef.current = transcript;
    setTimeout(() => { lastProcessedRef.current = ''; }, 3000);

    if (!isOpen) setIsOpen(true);
    handleUserInput(cleaned);
  }, [transcript]);

  // ========== TTS ==========
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

  // ========== COMMAND PROCESSING ==========
  const handleUserInput = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const clean = text.trim();
    const userMessage: Message = { role: 'user', content: clean };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // 1) NAVIGATION — instant
    const { navigated, label } = tryNavigate(clean);
    if (navigated) {
      const msg = `Pronto! ${label} aberto.`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      speakText(msg);
      return;
    }

    // 2) DIRECT ACTIONS — instant
    const actionResponse = await executeAction(clean);
    if (actionResponse) {
      setMessages(prev => [...prev, { role: 'assistant', content: actionResponse }]);
      speakText(actionResponse);
      return;
    }

    // 3) QUICK RESPONSES — instant
    const quickResponse = getQuickResponse(clean);
    if (quickResponse) {
      setMessages(prev => [...prev, { role: 'assistant', content: quickResponse }]);
      speakText(quickResponse);
      return;
    }

    // 4) AI — for complex questions
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: clean }
          ]
        }
      });
      if (error) throw error;
      const content = data.content || 'Desculpe, não consegui processar.';
      setMessages(prev => [...prev, { role: 'assistant', content }]);
      speakText(content);
    } catch (error: any) {
      console.error('AI error:', error);
      if (error.message?.includes('429')) {
        toast.error('Muitas requisições. Aguarde alguns segundos.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos de IA insuficientes.');
      } else {
        toast.error('Erro ao processar mensagem');
      }
      const errMsg = 'Desculpe, ocorreu um erro. Tente novamente.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct database actions
  const executeAction = async (text: string): Promise<string | null> => {
    const t = text.toLowerCase();

    if (t.includes('autoriza') || t.includes('participar') || t.includes('participa')) {
      try {
        const { data: novas, error } = await supabase
          .from('licitacoes')
          .select('id, numero, objeto_resumido, valor')
          .eq('status', 'Nova')
          .order('valor', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (!novas || novas.length === 0) return 'Não há licitações pendentes de autorização no momento.';

        const ids = novas.map(l => l.id);
        const { error: updateError } = await supabase
          .from('licitacoes')
          .update({ status: 'Autorizada' })
          .in('id', ids);

        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
        queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
        queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });

        toast.success(`✅ ${novas.length} licitações autorizadas`);
        return `Pronto! ${novas.length} licitações autorizadas com sucesso. O robô já está monitorando.`;
      } catch (err) {
        console.error('Erro ao autorizar:', err);
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
    if (t.includes('quantas') && t.includes('aguardando')) return `Há ${pendingCount} licitações aguardando autorização.`;
    if (t.includes('quais') && t.includes('aguardando')) return `${pendingCount} licitações aguardando. Diga "autoriza tudo" para liberar.`;
    if (t.includes('status') || t.includes('situação') || t.includes('situacao')) return `Sistema operacional. ${pendingCount} licitações pendentes.`;
    if (t.includes('obrigado') || t.includes('valeu')) return 'Às ordens!';
    if (t.includes('bom dia')) return 'Bom dia! Sistema operacional.';
    if (t.includes('boa tarde')) return 'Boa tarde! Tudo sob controle.';
    if (t.includes('boa noite')) return 'Boa noite! Monitoramento ativo.';
    return null;
  };

  const handleSend = () => handleUserInput(input);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    'Abre licitações',
    'Quantas estão aguardando?',
    'Autoriza tudo',
    'Abre medicamentos',
    'Ver relatórios',
  ];

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          "transition-all duration-300 hover:scale-110",
          isOpen && "hidden"
        )}
      >
        <Sparkles className="w-6 h-6 text-primary-foreground" />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">Gerente Digital</h3>
                <p className="text-xs text-primary-foreground/70">
                  {isListening ? '🎤 Ouvindo...' : isSpeaking ? '🔊 Falando...' : isLoading ? '🧠 Processando...' : 'IA + Voz • Licitações'}
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
                <X className="w-5 h-5" />
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
                    "flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-secondary-foreground rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {isListening && transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-primary/10 text-primary border border-primary/20 rounded-br-md italic">
                    🎤 {transcript}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && !isLoading && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Comandos rápidos:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleUserInput(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input + Mic */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              {/* Mic Button */}
              {isSupported && (
                <Button
                  variant={isListening ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => { isListening ? stopListening() : startListening(); }}
                  disabled={isLoading}
                  className={cn(
                    "shrink-0 transition-all",
                    isListening && "bg-green-500 hover:bg-green-600 ring-2 ring-green-500/30"
                  )}
                  title={isListening ? 'Parar microfone' : 'Ativar microfone'}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
              )}

              {isSpeaking && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={stopSpeaking}
                  className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                  title="Parar fala"
                >
                  <Square className="w-3 h-3" />
                </Button>
              )}

              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite ou fale seu comando..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Gerente Digital TenderAce • IA + Comando de Voz
            </p>
          </div>
        </div>
      )}
    </>
  );
};
