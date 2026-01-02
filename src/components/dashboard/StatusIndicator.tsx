import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export function StatusIndicator() {
  const [isActive, setIsActive] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-success/10 border border-success/20">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full bg-success ${isActive ? 'animate-pulse' : ''}`} />
        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success animate-ping opacity-75" />
      </div>
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-success">IA Ativa 24/7</span>
      </div>
    </div>
  );
}
