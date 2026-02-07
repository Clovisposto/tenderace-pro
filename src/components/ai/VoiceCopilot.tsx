import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, X, Bot, Loader2, Volume2, VolumeX, Square, BellRing, ChevronDown, Power, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { usePendingAlerts } from '@/hooks/usePendingAlerts';
import { useWakeWord } from '@/hooks/useWakeWord';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const VoiceCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(() => localStorage.getItem('copilotActive') !== 'false');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá, sou o Tom — seu assistente executivo de licitações. Estou ouvindo 24h. Diga "Tom" seguido do comando. Exemplo: "Tom, abre licitações" ou "Tom, quais licitações estão aguardando?"' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [alwaysOn, setAlwaysOn] = useState(() => localStorage.getItem('tomAlwaysOn') !== 'false');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { tryNavigate } = useVoiceNavigation();
  const { pendingCount } = usePendingAlerts();
  const { detectWakeWord } = useWakeWord();
  const lastProcessedRef = useRef('');
  const lastAlertCountRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Auto-start listening when active and alwaysOn
  useEffect(() => {
    if (isActive && alwaysOn && isSupported && !isListening) {
      const timer = setTimeout(() => {
        startListening();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive, alwaysOn, isSupported]);

  // Process transcript with wake word detection — react FAST
  useEffect(() => {
    if (!transcript || transcript === lastProcessedRef.current || isLoading) return;
    
    const { detected, command } = detectWakeWord(transcript);
    
    if (detected && command && command.length > 2) {
      lastProcessedRef.current = transcript;
      setTimeout(() => { lastProcessedRef.current = ''; }, 2000);
      
      // Execute immediately — don't wait
      if (!isOpen) setIsOpen(true);
      handleUserInput(command);
    }
  }, [transcript]);

  // Auto-notify about pending authorizations
  useEffect(() => {
    if (!isActive || pendingCount === 0) return;
    if (pendingCount !== lastAlertCountRef.current && pendingCount > 0) {
      lastAlertCountRef.current = pendingCount;
      const msg = pendingCount === 1
        ? `Senhor, tem uma licitação nova aguardando sua autorização. Deseja que eu abra os detalhes?`
        : `Senhor, tem ${pendingCount} licitações novas aguardando sua autorização. Diga "Tom, abre licitações" para verificar.`;
      
      toast.info(msg, {
        duration: 8000,
        action: { label: 'Ver', onClick: () => setIsOpen(true) },
      });

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
    const clean = text.trim();
    const userMessage: Message = { role: 'user', content: clean };
    setMessages(prev => [...prev, userMessage]);

    // 1) FAST PATH — navigation commands execute INSTANTLY
    const { navigated, label } = tryNavigate(clean);
    if (navigated) {
      const navMsg = `Pronto, senhor. ${label} aberto.`;
      setMessages(prev => [...prev, { role: 'assistant', content: navMsg }]);
      speakText(navMsg);
      return;
    }

    // 2) FAST PATH — action commands (authorize, refresh, status)
    const actionResponse = await executeAction(clean);
    if (actionResponse) {
      setMessages(prev => [...prev, { role: 'assistant', content: actionResponse }]);
      speakText(actionResponse);
      return;
    }

    // 3) FAST PATH — quick responses (no AI needed)
    const quickResponse = getQuickResponse(clean);
    if (quickResponse) {
      setMessages(prev => [...prev, { role: 'assistant', content: quickResponse }]);
      speakText(quickResponse);
      return;
    }

    // 4) AI path — only for complex questions
    setIsLoading(true);
    try {
      const systemContext = `Você é o Tom, assistente executivo de licitações do TenderAce PRO.
REGRAS:
- NO MÁXIMO 2 frases curtas. Sem perguntas. Execute.
- Trate como "senhor". Autonomia total.`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          messages: [
            { role: 'system', content: systemContext },
            ...messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: clean }
          ] 
        }
      });
      if (error) throw error;
      const content = data.content || 'Entendido, senhor. Executando.';
      setMessages(prev => [...prev, { role: 'assistant', content }]);
      const aiNav = tryNavigate(content);
      if (!aiNav.navigated) speakText(content);
    } catch {
      const errMsg = 'Problema técnico, senhor. Repita o comando.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      speakText(errMsg);
    } finally { setIsLoading(false); }
  };

  // ACTION COMMANDS — execute database operations directly
  const executeAction = async (text: string): Promise<string | null> => {
    const t = text.toLowerCase();

    // AUTHORIZE — "autoriza", "autorizar", "autoriza tudo", "autoriza todas"
    if (t.includes('autoriza') || t.includes('participar') || t.includes('participa')) {
      try {
        const { data: novas, error } = await supabase
          .from('licitacoes')
          .select('id, numero, objeto_resumido, valor')
          .eq('status', 'Nova')
          .order('valor', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (!novas || novas.length === 0) return 'Senhor, não há licitações pendentes de autorização no momento.';

        // Authorize all pending
        const ids = novas.map(l => l.id);
        const { error: updateError } = await supabase
          .from('licitacoes')
          .update({ status: 'Autorizada' })
          .in('id', ids);

        if (updateError) throw updateError;

        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
        queryClient.invalidateQueries({ queryKey: ['licitacoes-autorizadas'] });
        queryClient.invalidateQueries({ queryKey: ['minhas-participacoes'] });

        toast.success(`✅ ${novas.length} licitações autorizadas pelo Tom`);
        return `Pronto, senhor. ${novas.length} licitações autorizadas com sucesso. O robô já está monitorando.`;
      } catch (err) {
        console.error('[Tom] Erro ao autorizar:', err);
        return 'Senhor, erro ao autorizar. Tente novamente.';
      }
    }

    // REFRESH
    if (t.includes('atualiza') || t.includes('refresh') || t.includes('recarrega')) {
      window.location.reload();
      return 'Atualizando o sistema, senhor.';
    }

    // STOP NOTIFICATIONS
    if (t.includes('silêncio') || t.includes('silencio') || t.includes('para') || t.includes('cala')) {
      stopSpeaking();
      return 'Entendido, senhor. Silenciado.';
    }

    return null;
  };

  // Quick responses that don't need AI or DB
  const getQuickResponse = (text: string): string | null => {
    const t = text.toLowerCase();
    if (t.includes('quantas') && t.includes('aguardando')) return `Senhor, há ${pendingCount} licitações aguardando autorização.`;
    if (t.includes('quais') && t.includes('aguardando')) return `Senhor, ${pendingCount} licitações aguardando. Diga "Tom, autoriza tudo" para liberar.`;
    if (t.includes('status') || t.includes('situação') || t.includes('situacao')) return `Sistema operacional, senhor. ${pendingCount} pendentes.`;
    if (t.includes('obrigado') || t.includes('valeu')) return 'Às ordens, senhor.';
    if (t.includes('bom dia')) return 'Bom dia, senhor. Sistema operacional.';
    if (t.includes('boa tarde')) return 'Boa tarde, senhor. Tudo sob controle.';
    if (t.includes('boa noite')) return 'Boa noite, senhor. Monitoramento ativo.';
    return null;
  };

  const toggleActive = () => {
    const next = !isActive;
    setIsActive(next);
    localStorage.setItem('copilotActive', String(next));
    if (!next) { 
      stopSpeaking(); 
      stopListening();
      setIsOpen(false); 
    } else {
      if (alwaysOn && isSupported) startListening();
    }
    toast(next ? '🟢 Tom ativado — ouvindo 24h' : '🔴 Tom desativado');
  };

  const toggleAlwaysOn = () => {
    const next = !alwaysOn;
    setAlwaysOn(next);
    localStorage.setItem('tomAlwaysOn', String(next));
    if (next && isActive && isSupported && !isListening) {
      startListening();
    } else if (!next && isListening) {
      stopListening();
    }
    toast(next ? '🎤 Escuta contínua ativada' : '🎤 Escuta contínua desativada');
  };

  // ============ INACTIVE STATE ============
  if (!isActive) {
    return (
      <button
        onClick={toggleActive}
        className="fixed bottom-3 right-3 z-50 w-8 h-8 rounded-full bg-muted/60 hover:bg-primary/20 flex items-center justify-center opacity-30 hover:opacity-100 transition-all duration-500"
        title="Ativar Tom"
      >
        <Power className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  // ============ MINIMIZED — always-on indicator ============
  if (!isOpen) {
    return (
      <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1">
        {/* Always-on listening indicator */}
        {isListening && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-primary font-medium">Tom ouvindo</span>
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <button onClick={stopSpeaking} className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center animate-pulse" title="Parar fala">
            <Volume2 className="w-3.5 h-3.5 text-primary" />
          </button>
        )}

        {/* Pending badge */}
        {pendingCount > 0 && (
          <button onClick={() => setIsOpen(true)} className="relative" title={`${pendingCount} licitações aguardando`}>
            <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5 py-0.5 animate-pulse cursor-pointer hover:scale-110 transition-transform">
              {pendingCount}
            </Badge>
          </button>
        )}

        {/* Tom avatar button */}
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shadow-md transition-all duration-300",
            "bg-primary text-primary-foreground hover:scale-105",
            isListening && "ring-2 ring-green-500/50"
          )}
          title="Abrir Tom"
        >
          <Bot className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // ============ OPEN PANEL ============
  return (
    <div className="fixed bottom-3 right-3 z-50 w-[380px] max-w-[calc(100vw-1.5rem)] h-[500px] max-h-[calc(100vh-3rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            {isListening && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse border border-white/50" />
            )}
          </div>
          <div>
            <span className="font-bold text-primary-foreground text-sm">Tom</span>
            <span className="text-primary-foreground/60 text-xs ml-1">• Assistente Executivo</span>
            <p className="text-[9px] text-primary-foreground/50 leading-none mt-0.5">
              {isListening ? '🎤 Ouvindo... diga "Tom" + comando' : isSpeaking ? '🔊 Falando...' : isLoading ? '🧠 Processando...' : '24h operacional'}
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
          <Button variant="ghost" size="icon" onClick={toggleAlwaysOn}
            className="text-primary-foreground hover:bg-white/20 h-6 w-6" title={alwaysOn ? 'Desativar escuta contínua' : 'Ativar escuta contínua'}>
            {alwaysOn ? <Zap className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAutoSpeak(!autoSpeak)}
            className="text-primary-foreground hover:bg-white/20 h-6 w-6">
            {autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleActive}
            className="text-primary-foreground hover:bg-white/20 h-6 w-6" title="Desativar Tom">
            <Power className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { stopSpeaking(); setIsOpen(false); }}
            className="text-primary-foreground hover:bg-white/20 h-6 w-6" title="Minimizar">
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 bg-muted/30 border-b flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-muted-foreground">{isListening ? 'Mic ativo' : 'Mic inativo'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${alwaysOn ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className="text-muted-foreground">{alwaysOn ? '24h ligado' : 'Manual'}</span>
          </div>
        </div>
        <span className="text-muted-foreground">Wake word: "Tom"</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2.5">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-primary" />
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
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-[10px] text-muted-foreground">Tom processando...</span>
              </div>
            </div>
          )}

          {isListening && transcript && (
            <div className="flex gap-2 justify-end">
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs bg-primary/10 text-primary border border-primary/20 rounded-br-sm italic">
                🎤 {transcript}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {messages.length <= 2 && !isLoading && !isListening && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[9px] text-muted-foreground text-center">Diga "Tom" + um destes comandos:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {['Abre licitações', 'Quais estão aguardando?', 'Abre medicamentos', 'Abre empreendimentos', 'Ver relatórios'].map((a, i) => (
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
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => { if (isListening) stopListening(); else startListening(); }}
            disabled={isLoading || !isSupported}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
              "active:scale-95 disabled:opacity-50",
              isListening
                ? "bg-green-500 text-white ring-2 ring-green-500/30"
                : "bg-primary text-primary-foreground hover:scale-105"
            )}
          >
            {isListening && <span className="absolute w-12 h-12 rounded-full bg-green-500/20 animate-ping" />}
            {isListening ? <Mic className="w-5 h-5 relative z-10" /> : <MicOff className="w-5 h-5 relative z-10" />}
          </button>
          <span className="text-[9px] text-muted-foreground">
            {isListening ? 'Diga "Tom, ..."' : 'Clique para ativar'}
          </span>
        </div>
        {isSpeaking && <div className="w-7" />}
      </div>
    </div>
  );
};
