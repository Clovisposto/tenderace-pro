import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronDown,
  Zap,
  Radio,
  Clock,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortalResult {
  portal: string;
  success: boolean;
  count: number;
  error?: string;
  retries?: number;
}

interface CaptureStatus {
  success: boolean;
  message: string;
  total: number;
  portals: PortalResult[];
  fallbackActivated: boolean;
  timestamp: string;
}

interface CaptureStatusIndicatorProps {
  onCapture: () => Promise<any>;
  isCapturing: boolean;
  autoCapture?: boolean;
  autoInterval?: number;
}

// UFs and cities being monitored
const MONITORED_REGIONS = [
  { uf: 'PA', cidades: ['Belém', 'Ananindeua', 'Santarém', 'Marabá'] },
  { uf: 'TO', cidades: ['Palmas', 'Araguaína', 'Gurupi'] },
  { uf: 'MA', cidades: ['São Luís', 'Imperatriz', 'Caxias'] },
  { uf: 'GO', cidades: ['Goiânia', 'Anápolis', 'Rio Verde'] },
  { uf: 'MT', cidades: ['Cuiabá', 'Várzea Grande', 'Rondonópolis'] },
];

export const CaptureStatusIndicator = ({ 
  onCapture, 
  isCapturing,
  autoCapture = true,
  autoInterval = 60
}: CaptureStatusIndicatorProps) => {
  const [lastStatus, setLastStatus] = useState<CaptureStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [nextCaptureIn, setNextCaptureIn] = useState(autoInterval);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(autoCapture);
  const [scanningRegion, setScanningRegion] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Rotate scanning region animation
  useEffect(() => {
    if (!autoCaptureEnabled) return;
    const interval = setInterval(() => {
      setScanningRegion(prev => (prev + 1) % MONITORED_REGIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoCaptureEnabled]);

  const handleCapture = useCallback(async () => {
    try {
      const result = await onCapture();
      if (result) {
        setLastStatus({ ...result, timestamp: new Date().toISOString() });
      }
      setNextCaptureIn(autoInterval);
    } catch (error) {
      console.error('Capture error:', error);
    }
  }, [onCapture, autoInterval]);

  useEffect(() => {
    if (!autoCaptureEnabled || isCapturing) return;
    const timer = setInterval(() => {
      setNextCaptureIn(prev => {
        if (prev <= 1) { handleCapture(); return autoInterval; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoCaptureEnabled, isCapturing, handleCapture, autoInterval]);

  useEffect(() => {
    if (autoCaptureEnabled && !lastStatus) {
      const timeout = setTimeout(() => handleCapture(), 2000);
      return () => clearTimeout(timeout);
    }
  }, []);

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />;
  };

  const getPortalColor = (portal: string) => {
    switch (portal) {
      case 'PNCP': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'BLL': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'ComprasNet': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const currentRegion = MONITORED_REGIONS[scanningRegion];

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isCapturing ? "bg-warning animate-pulse" :
                autoCaptureEnabled ? "bg-success animate-pulse" : "bg-muted"
              )} />
              
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Radio className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">Captura Automática IA</span>
                <span className="sm:hidden">Auto IA</span>
              </div>

              {autoCaptureEnabled && !isCapturing && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(nextCaptureIn)}
                </Badge>
              )}

              {isCapturing && (
                <Badge variant="secondary" className="text-xs gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Capturando...
                </Badge>
              )}

              {/* Scanning region indicator */}
              {autoCaptureEnabled && currentRegion && (
                <Badge variant="outline" className="text-xs gap-1 hidden md:flex animate-in fade-in duration-500">
                  <MapPin className="w-3 h-3" />
                  {currentRegion.uf} • {currentRegion.cidades[0]}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lastStatus && (
                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                  {lastStatus.fallbackActivated && (
                    <Badge variant="outline" className="text-xs gap-1 border-warning text-warning">
                      <AlertTriangle className="w-3 h-3" />
                      Fallback
                    </Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {lastStatus.total} capturados
                  </span>
                </div>
              )}

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>

              <Button
                variant={autoCaptureEnabled ? "outline" : "default"}
                size="sm"
                onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                className="text-xs h-7"
              >
                {autoCaptureEnabled ? 'Pausar' : 'Ativar'}
              </Button>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t border-border">
            <div className="pt-3 space-y-3">
              {/* Monitored Regions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Regiões Monitoradas 24/7
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MONITORED_REGIONS.map((region, idx) => (
                    <Badge
                      key={region.uf}
                      variant="outline"
                      className={cn(
                        "text-xs transition-all duration-300",
                        idx === scanningRegion && autoCaptureEnabled
                          ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                          : "text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mr-1",
                        idx === scanningRegion && autoCaptureEnabled ? "bg-success animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      {region.uf}
                      <span className="ml-1 text-[10px] opacity-70">
                        ({region.cidades.length})
                      </span>
                    </Badge>
                  ))}
                </div>
                {autoCaptureEnabled && currentRegion && (
                  <p className="text-[10px] text-muted-foreground animate-in fade-in duration-500">
                    Escaneando: {currentRegion.cidades.join(', ')} ({currentRegion.uf})
                  </p>
                )}
              </div>

              {/* Portal Status Grid */}
              {lastStatus ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {lastStatus.portals.map((portal, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md border text-xs",
                          getPortalColor(portal.portal)
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(portal.success)}
                          <span className="font-medium">{portal.portal}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {portal.retries !== undefined && portal.retries > 0 && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              {portal.retries} retry
                            </Badge>
                          )}
                          <span className="font-mono">+{portal.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <span>
                      Última captura: {new Date(lastStatus.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <div className="flex items-center gap-2">
                      {lastStatus.fallbackActivated && (
                        <span className="text-warning flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Fallback ativado
                        </span>
                      )}
                      <span className="text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verificado
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Activity className="w-5 h-5 mx-auto mb-2 animate-pulse" />
                  Aguardando primeira captura automática...
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
