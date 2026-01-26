import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgaoPagadorFilterProps {
  value: string;
  onChange: (value: string) => void;
  orgaosPagadores: string[];
  className?: string;
}

export function OrgaoPagadorFilter({ 
  value, 
  onChange, 
  orgaosPagadores,
  className 
}: OrgaoPagadorFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on search term
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm) return orgaosPagadores.slice(0, 10);
    const term = searchTerm.toLowerCase();
    return orgaosPagadores
      .filter(orgao => orgao.toLowerCase().includes(term))
      .slice(0, 10);
  }, [searchTerm, orgaosPagadores]);

  // Update search term when value changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    onChange(suggestion);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          Órgão Pagador
        </label>
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="Buscar município/UF..."
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            className="h-8 text-sm bg-background border-border pr-16"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/10"
                onClick={handleClear}
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(!isOpen)}
            >
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Dropdown with suggestions */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
          <div className="p-1">
            {filteredSuggestions.map((suggestion, index) => {
              const [municipio, uf] = suggestion.split('/');
              return (
                <button
                  key={index}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <span className="truncate">{municipio}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {uf}
                  </Badge>
                </button>
              );
            })}
          </div>
          {filteredSuggestions.length === 10 && (
            <div className="px-2 py-1 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Digite para filtrar mais resultados...
              </p>
            </div>
          )}
        </div>
      )}

      {isOpen && filteredSuggestions.length === 0 && searchTerm && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum órgão pagador encontrado
          </p>
        </div>
      )}
    </div>
  );
}
