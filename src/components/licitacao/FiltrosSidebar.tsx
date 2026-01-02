import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  X,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { portais, modalidades, estados } from '@/data/mockData';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface FiltrosState {
  busca: string;
  portais: string[];
  modalidades: string[];
  ufs: string[];
  segmentos: string[];
  valorMin: number;
  valorMax: number;
  status: string[];
}

interface FiltrosSidebarProps {
  filtros: FiltrosState;
  onFilterChange: (filtros: FiltrosState) => void;
  totalResultados: number;
}

const STATUS_OPTIONS = [
  'Nova',
  'Em Análise',
  'Aguardando Autorização',
  'Autorizada',
  'Em Disputa',
  'Vencida',
  'Perdida',
  'Cancelada'
];

const SEGMENTOS = ['Medicamentos', 'Empreendimentos'];

export function FiltrosSidebar({ filtros, onFilterChange, totalResultados }: FiltrosSidebarProps) {
  const [portaisOpen, setPortaisOpen] = useState(true);
  const [modalidadesOpen, setModalidadesOpen] = useState(true);
  const [ufsOpen, setUfsOpen] = useState(false);
  const [segmentosOpen, setSegmentosOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [valorOpen, setValorOpen] = useState(true);

  const updateFiltro = <K extends keyof FiltrosState>(key: K, value: FiltrosState[K]) => {
    onFilterChange({ ...filtros, [key]: value });
  };

  const toggleArrayItem = (key: 'portais' | 'modalidades' | 'ufs' | 'segmentos' | 'status', item: string) => {
    const current = filtros[key];
    const updated = current.includes(item)
      ? current.filter((i: string) => i !== item)
      : [...current, item];
    updateFiltro(key, updated);
  };

  const limparFiltros = () => {
    onFilterChange({
      busca: '',
      portais: [],
      modalidades: [],
      ufs: [],
      segmentos: [],
      valorMin: 1000,
      valorMax: 35000,
      status: []
    });
  };

  const totalFiltrosAtivos = 
    filtros.portais.length + 
    filtros.modalidades.length + 
    filtros.ufs.length + 
    filtros.segmentos.length +
    filtros.status.length +
    (filtros.busca ? 1 : 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-72 glass-card h-fit sticky top-4">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="font-semibold">Filtros</span>
            {totalFiltrosAtivos > 0 && (
              <Badge variant="default" className="text-xs">
                {totalFiltrosAtivos}
              </Badge>
            )}
          </div>
          {totalFiltrosAtivos > 0 && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-8 text-xs gap-1">
              <RotateCcw className="w-3 h-3" />
              Limpar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {totalResultados} {totalResultados === 1 ? 'resultado' : 'resultados'}
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-4">
          {/* Busca */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">BUSCAR</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Objeto, órgão, município..."
                value={filtros.busca}
                onChange={(e) => updateFiltro('busca', e.target.value)}
                className="pl-9 bg-secondary/50 border-border/50 text-sm h-9"
              />
              {filtros.busca && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => updateFiltro('busca', '')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Portal */}
          <Collapsible open={portaisOpen} onOpenChange={setPortaisOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
              <Label className="text-xs font-medium text-muted-foreground cursor-pointer">
                PORTAL {filtros.portais.length > 0 && `(${filtros.portais.length})`}
              </Label>
              {portaisOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {portais.map((portal) => (
                <div key={portal} className="flex items-center gap-2">
                  <Checkbox
                    id={`portal-${portal}`}
                    checked={filtros.portais.includes(portal)}
                    onCheckedChange={() => toggleArrayItem('portais', portal)}
                  />
                  <label htmlFor={`portal-${portal}`} className="text-sm cursor-pointer flex-1">
                    {portal}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-border/50" />

          {/* Segmento */}
          <Collapsible open={segmentosOpen} onOpenChange={setSegmentosOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
              <Label className="text-xs font-medium text-muted-foreground cursor-pointer">
                SEGMENTO {filtros.segmentos.length > 0 && `(${filtros.segmentos.length})`}
              </Label>
              {segmentosOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {SEGMENTOS.map((segmento) => (
                <div key={segmento} className="flex items-center gap-2">
                  <Checkbox
                    id={`segmento-${segmento}`}
                    checked={filtros.segmentos.includes(segmento)}
                    onCheckedChange={() => toggleArrayItem('segmentos', segmento)}
                  />
                  <label htmlFor={`segmento-${segmento}`} className="text-sm cursor-pointer flex-1">
                    {segmento}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-border/50" />

          {/* Modalidade */}
          <Collapsible open={modalidadesOpen} onOpenChange={setModalidadesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
              <Label className="text-xs font-medium text-muted-foreground cursor-pointer">
                MODALIDADE {filtros.modalidades.length > 0 && `(${filtros.modalidades.length})`}
              </Label>
              {modalidadesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {modalidades.map((modalidade) => (
                <div key={modalidade} className="flex items-center gap-2">
                  <Checkbox
                    id={`modalidade-${modalidade}`}
                    checked={filtros.modalidades.includes(modalidade)}
                    onCheckedChange={() => toggleArrayItem('modalidades', modalidade)}
                  />
                  <label htmlFor={`modalidade-${modalidade}`} className="text-sm cursor-pointer flex-1">
                    {modalidade}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-border/50" />

          {/* Valor */}
          <Collapsible open={valorOpen} onOpenChange={setValorOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
              <Label className="text-xs font-medium text-muted-foreground cursor-pointer">
                VALOR ESTIMADO
              </Label>
              {valorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(filtros.valorMin)}</span>
                <span>{formatCurrency(filtros.valorMax)}</span>
              </div>
              <Slider
                value={[filtros.valorMin, filtros.valorMax]}
                min={0}
                max={50000}
                step={1000}
                onValueChange={([min, max]) => {
                  onFilterChange({ ...filtros, valorMin: min, valorMax: max });
                }}
                className="w-full"
              />
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-border/50" />

          {/* UF */}
          <Collapsible open={ufsOpen} onOpenChange={setUfsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
              <Label className="text-xs font-medium text-muted-foreground cursor-pointer">
                ESTADO (UF) {filtros.ufs.length > 0 && `(${filtros.ufs.length})`}
              </Label>
              {ufsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-4 gap-1">
                {estados.map((uf) => (
                  <Button
                    key={uf}
                    variant={filtros.ufs.includes(uf) ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs p-0"
                    onClick={() => toggleArrayItem('ufs', uf)}
                  >
                    {uf}
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-border/50" />

          {/* Status */}
          <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
              <Label className="text-xs font-medium text-muted-foreground cursor-pointer">
                STATUS {filtros.status.length > 0 && `(${filtros.status.length})`}
              </Label>
              {statusOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filtros.status.includes(status)}
                    onCheckedChange={() => toggleArrayItem('status', status)}
                  />
                  <label htmlFor={`status-${status}`} className="text-sm cursor-pointer flex-1">
                    {status}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}