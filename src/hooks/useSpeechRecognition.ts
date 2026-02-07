import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const lastStartTimeRef = useRef(0);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const clearRestartTimeout = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  const safeRestart = useCallback(() => {
    if (!shouldRestartRef.current || !recognitionRef.current) return;

    // Prevent rapid restarts — minimum 2s between starts
    const now = Date.now();
    const elapsed = now - lastStartTimeRef.current;
    const backoff = Math.min(2000 + consecutiveErrorsRef.current * 1000, 10000);
    const delay = Math.max(backoff - elapsed, 500);

    clearRestartTimeout();
    restartTimeoutRef.current = setTimeout(() => {
      if (!shouldRestartRef.current) return;
      try {
        lastStartTimeRef.current = Date.now();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        // "already started" or other — wait longer
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current < 10 && shouldRestartRef.current) {
          safeRestart();
        }
      }
    }, delay);
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      consecutiveErrorsRef.current = 0; // Reset on success
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Permissão de microfone negada. Ative nas configurações do navegador.');
        shouldRestartRef.current = false;
        setIsListening(false);
        return;
      }
      // For aborted/no-speech/network errors — just let onend handle restart
      // Don't log aborted errors (they're normal during restart cycles)
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error);
      }
      consecutiveErrorsRef.current++;
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldRestartRef.current) {
        safeRestart();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      clearRestartTimeout();
      try { recognition.abort(); } catch {}
    };
  }, [isSupported, safeRestart]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    shouldRestartRef.current = true;
    consecutiveErrorsRef.current = 0;
    lastStartTimeRef.current = Date.now();
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // Already started — that's fine
      setIsListening(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    consecutiveErrorsRef.current = 0;
    clearRestartTimeout();
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch {}
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
}
