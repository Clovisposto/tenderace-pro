import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BLLFiltersState {
  promotor: string;
  numero: string;
  cidade: string;
  uf: string;
  modalidade: string;
  situacao: string;
  pubInicio: Date | undefined;
  pubFim: Date | undefined;
}

interface BLLFiltersBarProps {
  filters: BLLFiltersState;
  onFilterChange: (filters: BLLFiltersState) => void;
  onBuscar: () => void;
  onLimpar: () => void;
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

export function BLLFiltersBar({ filters, onFilterChange, onBuscar, onLimpar }: BLLFiltersBarProps) {
  const updateFilter = useCallback(<K extends keyof BLLFiltersState>(key: K, value: BLLFiltersState[K]) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  return (
    <div className="bll-filter-bar">
      <div className="flex flex-wrap items-end gap-2">
        {/* Promotor (Órgão) */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground font-medium">Promotor</label>
          <Input
            placeholder="Órgão/Entidade"
            value={filters.promotor}
            onChange={(e) => updateFilter('promotor', e.target.value)}
            className="h-8 text-sm bg-background border-border"
          />
        </div>

        {/* Nº Edital/Processo */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground font-medium">Nº Edital</label>
          <Input
            placeholder="Número"
            value={filters.numero}
            onChange={(e) => updateFilter('numero', e.target.value)}
            className="h-8 text-sm bg-background border-border"
          />
        </div>

        {/* Cidade */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground font-medium">Cidade</label>
          <Input
            placeholder="Município"
            value={filters.cidade}
            onChange={(e) => updateFilter('cidade', e.target.value)}
            className="h-8 text-sm bg-background border-border"
          />
        </div>

        {/* Estado (UF) */}
        <div className="flex flex-col gap-1 min-w-[80px]">
          <label className="text-xs text-muted-foreground font-medium">Estado</label>
          <Select value={filters.uf} onValueChange={(v) => updateFilter('uf', v)}>
            <SelectTrigger className="h-8 text-sm bg-background border-border w-[80px]">
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

        {/* Modalidade */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-xs text-muted-foreground font-medium">Modalidade</label>
          <Select value={filters.modalidade} onValueChange={(v) => updateFilter('modalidade', v)}>
            <SelectTrigger className="h-8 text-sm bg-background border-border">
              <SelectValue placeholder="Selecione" />
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
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground font-medium">Situação</label>
          <Select value={filters.situacao} onValueChange={(v) => updateFilter('situacao', v)}>
            <SelectTrigger className="h-8 text-sm bg-background border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {SITUACAO_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Public. Início */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Public. Início</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 w-[110px] justify-start text-left font-normal text-sm bg-background border-border",
                  !filters.pubInicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {filters.pubInicio ? format(filters.pubInicio, "dd/MM/yy") : "Data"}
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

        {/* Public. Fim */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Public. Fim</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 w-[110px] justify-start text-left font-normal text-sm bg-background border-border",
                  !filters.pubFim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {filters.pubFim ? format(filters.pubFim, "dd/MM/yy") : "Data"}
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

        {/* Botões */}
        <div className="flex gap-1 ml-auto">
          <Button onClick={onBuscar} size="sm" className="h-8 gap-1">
            <Search className="w-3 h-3" />
            Buscar
          </Button>
          <Button onClick={onLimpar} variant="outline" size="sm" className="h-8 gap-1">
            <X className="w-3 h-3" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
