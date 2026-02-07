import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingAlert {
  id: string;
  numero: string;
  objeto_resumido: string;
  valor: number;
  orgao: string;
  data_abertura: string;
}

export function usePendingAlerts() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAlerts, setPendingAlerts] = useState<PendingAlert[]>([]);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPending = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('id, numero, objeto_resumido, valor, orgao, data_abertura')
        .eq('status', 'Nova')
        .order('valor', { ascending: false })
        .limit(10);

      if (!error && data) {
        setPendingCount(data.length);
        setPendingAlerts(data);
        setLastChecked(new Date());
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    checkPending();
    intervalRef.current = setInterval(checkPending, 60000); // check every 60s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkPending]);

  return { pendingCount, pendingAlerts, lastChecked, refresh: checkPending };
}
