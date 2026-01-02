import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X,
  ChevronDown
} from 'lucide-react';
import { portais, modalidades, estados } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FiltrosLicitacaoProps {
  onFilterChange: (filters: any) => void;
}

export function FiltrosLicitacao({ onFilterChange }: FiltrosLicitacaoProps) {
  const [busca, setBusca] = useState('');
  const [portaisSelecionados, setPortaisSelecionados] = useState<string[]>([]);
  const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState<string[]>([]);
  const [ufsSelecionadas, setUfsSelecionadas] = useState<string[]>([]);

  const handleBuscaChange = (value: string) => {
    setBusca(value);
    onFilterChange({ busca: value, portais: portaisSelecionados, modalidades: modalidadesSelecionadas, ufs: ufsSelecionadas });
  };

  const togglePortal = (portal: string) => {
    const updated = portaisSelecionados.includes(portal)
      ? portaisSelecionados.filter(p => p !== portal)
      : [...portaisSelecionados, portal];
    setPortaisSelecionados(updated);
    onFilterChange({ busca, portais: updated, modalidades: modalidadesSelecionadas, ufs: ufsSelecionadas });
  };

  const toggleModalidade = (modalidade: string) => {
    const updated = modalidadesSelecionadas.includes(modalidade)
      ? modalidadesSelecionadas.filter(m => m !== modalidade)
      : [...modalidadesSelecionadas, modalidade];
    setModalidadesSelecionadas(updated);
    onFilterChange({ busca, portais: portaisSelecionados, modalidades: updated, ufs: ufsSelecionadas });
  };

  const toggleUf = (uf: string) => {
    const updated = ufsSelecionadas.includes(uf)
      ? ufsSelecionadas.filter(u => u !== uf)
      : [...ufsSelecionadas, uf];
    setUfsSelecionadas(updated);
    onFilterChange({ busca, portais: portaisSelecionados, modalidades: modalidadesSelecionadas, ufs: updated });
  };

  const limparFiltros = () => {
    setBusca('');
    setPortaisSelecionados([]);
    setModalidadesSelecionadas([]);
    setUfsSelecionadas([]);
    onFilterChange({ busca: '', portais: [], modalidades: [], ufs: [] });
  };

  const totalFiltros = portaisSelecionados.length + modalidadesSelecionadas.length + ufsSelecionadas.length;

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por objeto, órgão, município..."
          value={busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50"
        />
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Portal
              {portaisSelecionados.length > 0 && (
                <Badge variant="default" className="ml-1 px-1.5 py-0 text-xs">
                  {portaisSelecionados.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {portais.map(portal => (
              <DropdownMenuCheckboxItem
                key={portal}
                checked={portaisSelecionados.includes(portal)}
                onCheckedChange={() => togglePortal(portal)}
              >
                {portal}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Modalidade
              {modalidadesSelecionadas.length > 0 && (
                <Badge variant="default" className="ml-1 px-1.5 py-0 text-xs">
                  {modalidadesSelecionadas.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {modalidades.map(modalidade => (
              <DropdownMenuCheckboxItem
                key={modalidade}
                checked={modalidadesSelecionadas.includes(modalidade)}
                onCheckedChange={() => toggleModalidade(modalidade)}
              >
                {modalidade}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              UF
              {ufsSelecionadas.length > 0 && (
                <Badge variant="default" className="ml-1 px-1.5 py-0 text-xs">
                  {ufsSelecionadas.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 max-h-64 overflow-auto">
            {estados.map(uf => (
              <DropdownMenuCheckboxItem
                key={uf}
                checked={ufsSelecionadas.includes(uf)}
                onCheckedChange={() => toggleUf(uf)}
              >
                {uf}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {totalFiltros > 0 && (
          <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-1 text-muted-foreground">
            <X className="w-4 h-4" />
            Limpar ({totalFiltros})
          </Button>
        )}
      </div>

      {/* Active filters */}
      {(portaisSelecionados.length > 0 || modalidadesSelecionadas.length > 0 || ufsSelecionadas.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
          {portaisSelecionados.map(portal => (
            <Badge key={portal} variant="portal" className="gap-1 cursor-pointer" onClick={() => togglePortal(portal)}>
              {portal}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {modalidadesSelecionadas.map(modalidade => (
            <Badge key={modalidade} variant="modalidade" className="gap-1 cursor-pointer" onClick={() => toggleModalidade(modalidade)}>
              {modalidade}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {ufsSelecionadas.map(uf => (
            <Badge key={uf} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleUf(uf)}>
              {uf}
              <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
