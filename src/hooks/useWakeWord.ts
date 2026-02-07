import { useCallback, useRef } from 'react';

const WAKE_WORD = 'tom';
const WAKE_PATTERNS = [
  /^tom[,.\s]+/i,
  /\btom[,.\s]+/i,
  /^t[oó]m[,.\s]+/i,
  /\bt[oó]m[,.\s]+/i,
  /^tô[nm][,.\s]+/i,
  /\btô[nm][,.\s]+/i,
];

interface UseWakeWordReturn {
  detectWakeWord: (text: string) => { detected: boolean; command: string };
}

export function useWakeWord(): UseWakeWordReturn {
  const detectWakeWord = useCallback((text: string): { detected: boolean; command: string } => {
    const normalized = text.toLowerCase().trim();
    
    for (const pattern of WAKE_PATTERNS) {
      const match = normalized.match(pattern);
      if (match) {
        const command = normalized.substring(match[0].length).trim();
        return { detected: true, command: command || '' };
      }
    }

    // Also check if the entire text is just the wake word (user said "Tom" and is about to say more)
    if (normalized === 'tom' || normalized === 'tóm' || normalized === 'tom,') {
      return { detected: true, command: '' };
    }

    return { detected: false, command: '' };
  }, []);

  return { detectWakeWord };
}
