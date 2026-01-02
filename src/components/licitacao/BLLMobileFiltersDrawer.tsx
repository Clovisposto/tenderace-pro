import { useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, Search, X, CalendarIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BLLFiltersState } from './BLLFiltersBar';

interface BLLMobileFiltersDrawerProps {
  filters: BLLFiltersState;
  onFilterChange: (filters: BLLFiltersState) => void;
  onBuscar: () => void;
  onLimpar: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFiltersCount: number;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const MODALIDADE_OPTIONS = [
  { value: 'Dispensa com Disputa', label: 'Dispensa c/ Disputa' },
  { value: 'Dispensa sem Disputa', label: 'Dispensa s/ Disputa' },
  { value: 'Compra Direta', label: 'Compra Direta' },
];

const SITUACAO_OPTIONS = [
  { value: 'Nova', label: 'Nova' },
  { value: 'Em Análise', label: 'Em Análise' },
  { value: 'Aguardando Autorização', label: 'Aguardando' },
  { value: 'Autorizada', label: 'Autorizada' },
  { value: 'Em Disputa', label: 'Em Disputa' },
  { value: 'Vencida', label: 'Vencida' },
  { value: 'Perdida', label: 'Perdida' },
  { value: 'Cancelada', label: 'Cancelada' },
];

export function BLLMobileFiltersDrawer({ 
  filters, 
  onFilterChange, 
  onBuscar, 
  onLimpar,
  open,
  onOpenChange,
  activeFiltersCount
}: BLLMobileFiltersDrawerProps) {
  const updateFilter = useCallback(<K extends keyof BLLFiltersState>(key: K, value: BLLFiltersState[K]) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const handleBuscar = () => {
    onBuscar();
    onOpenChange(false);
  };

  const handleLimpar = () => {
    onLimpar();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filtros de Busca
            </SheetTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleLimpar} className="gap-1 text-muted-foreground">
                <RotateCcw className="w-4 h-4" />
                Limpar
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Promotor (Órgão) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Promotor/Órgão</Label>
            <Input
              placeholder="Nome do órgão ou entidade"
              value={filters.promotor}
              onChange={(e) => updateFilter('promotor', e.target.value)}
              className="bg-secondary/50"
            />
          </div>

          {/* Nº Edital/Processo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nº Edital/Processo</Label>
            <Input
              placeholder="Número do processo"
              value={filters.numero}
              onChange={(e) => updateFilter('numero', e.target.value)}
              className="bg-secondary/50"
            />
          </div>

          {/* Cidade e UF */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cidade</Label>
              <Input
                placeholder="Município"
                value={filters.cidade}
                onChange={(e) => updateFilter('cidade', e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado</Label>
              <Select value={filters.uf} onValueChange={(v) => updateFilter('uf', v)}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {UF_OPTIONS.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modalidade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modalidade</Label>
            <Select value={filters.modalidade} onValueChange={(v) => updateFilter('modalidade', v)}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {MODALIDADE_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Situação */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Situação</Label>
            <Select value={filters.situacao} onValueChange={(v) => updateFilter('situacao', v)}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Selecione a situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SITUACAO_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-secondary/50",
                      !filters.pubInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.pubInicio ? format(filters.pubInicio, "dd/MM/yy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.pubInicio}
                    onSelect={(d) => updateFilter('pubInicio', d)}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-secondary/50",
                      !filters.pubFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.pubFim ? format(filters.pubFim, "dd/MM/yy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.pubFim}
                    onSelect={(d) => updateFilter('pubFim', d)}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="pt-4 border-t border-border flex gap-3">
          <Button variant="outline" onClick={handleLimpar} className="flex-1 gap-2">
            <X className="w-4 h-4" />
            Limpar
          </Button>
          <Button onClick={handleBuscar} className="flex-1 gap-2">
            <Search className="w-4 h-4" />
            Buscar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
