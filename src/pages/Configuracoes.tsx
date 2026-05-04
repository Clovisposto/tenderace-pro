import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmpresasContent } from '@/pages/Empresas';
import { ConectoresContent } from '@/pages/Conectores';
import { RelatoriosContent } from '@/pages/Relatorios';
import { ManualContent } from '@/pages/Manual';
import { AdminContent } from '@/pages/Admin';
import { 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Zap,
  DollarSign,
  Clock,
  Save,
  RefreshCw,
  MapPin,
  Globe,
  CheckCircle2,
  Building2,
  ChevronDown,
  ChevronRight,
  X,
  XCircle,
  ShoppingCart,
  Wrench,
  Gavel,
  FileText,
  Search,
  Mail,
  Phone,
  Trophy,
  AlertTriangle,
  Volume2,
  VolumeX,
  MessageSquare,
  Timer
} from 'lucide-react';

// Modalidades disponíveis
const MODALIDADES_DISPONIVEIS = [
  { id: 'Dispensa com Disputa', nome: 'Dispensa com Disputa', descricao: 'Compras até R$ 50.000 com competição' },
  { id: 'Dispensa sem Disputa', nome: 'Dispensa sem Disputa', descricao: 'Compras diretas sem licitação' },
  { id: 'Compra Direta', nome: 'Compra Direta', descricao: 'Aquisições de pequeno valor' },
  { id: 'Pregão Eletrônico', nome: 'Pregão Eletrônico', descricao: 'Licitação eletrônica aberta' },
  { id: 'Concorrência', nome: 'Concorrência', descricao: 'Licitações de maior valor' },
];
import { useState, useEffect } from 'react';
import { useConfiguracoes, useUpdateConfiguracoes, type MunicipiosPriorizados } from '@/hooks/useConfiguracoes';
import { MUNICIPIOS_POR_UF, getMunicipiosUF } from '@/data/municipiosBrasil';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Todos os 27 estados brasileiros
const TODOS_ESTADOS = [
  { uf: 'AC', nome: 'Acre', regiao: 'Norte' },
  { uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { uf: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { uf: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { uf: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  { uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { uf: 'PA', nome: 'Pará', regiao: 'Norte' },
  { uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { uf: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { uf: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { uf: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { uf: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  { uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  { uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  { uf: 'TO', nome: 'Tocantins', regiao: 'Norte' },
];

const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const Configuracoes = () => {
  const { data: savedConfig, isLoading } = useConfiguracoes();
  const updateConfig = useUpdateConfiguracoes();
  
  const [configs, setConfigs] = useState({
    valorMinimo: 1000,
    valorMaximo: 35000,
    margemMinima: 8,
    lanceAutomatico: true,
    notificacoesEmail: true,
    notificacoesPush: true,
    notificacoesTelefone: false,
    telefoneNotificacao: '',
    notificacoesVitoria: true,
    notificacoesDerrota: true,
    notificacoesNovaLicitacao: true,
    notificacoesPrazoUrgente: true,
    notificacoesDisputa: true,
    somNotificacao: true,
    captacaoContinua: true,
    prioridadeInterior: true,
    ufsPriorizadas: [] as string[],
    municipiosPriorizados: {} as MunicipiosPriorizados,
    tiposLicitacao: ['compra', 'servico'] as string[],
    modalidadesPermitidas: ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'] as string[],
  });

  const [expandedUFs, setExpandedUFs] = useState<string[]>([]);
  const [cidadeSearch, setCidadeSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    if (savedConfig) {
      setConfigs({
        valorMinimo: savedConfig.valor_minimo || 1000,
        valorMaximo: savedConfig.valor_maximo || 35000,
        margemMinima: savedConfig.margem_minima || 8,
        lanceAutomatico: savedConfig.lance_automatico ?? true,
        notificacoesEmail: savedConfig.notificacoes_email ?? true,
        notificacoesPush: savedConfig.notificacoes_push ?? true,
        notificacoesTelefone: (savedConfig as any).notificacoes_telefone ?? false,
        telefoneNotificacao: (savedConfig as any).telefone_notificacao || '',
        notificacoesVitoria: (savedConfig as any).notificacoes_vitoria ?? true,
        notificacoesDerrota: (savedConfig as any).notificacoes_derrota ?? true,
        notificacoesNovaLicitacao: (savedConfig as any).notificacoes_nova_licitacao ?? true,
        notificacoesPrazoUrgente: (savedConfig as any).notificacoes_prazo_urgente ?? true,
        notificacoesDisputa: (savedConfig as any).notificacoes_disputa ?? true,
        somNotificacao: (savedConfig as any).som_notificacao ?? true,
        captacaoContinua: savedConfig.captacao_continua ?? true,
        prioridadeInterior: savedConfig.prioridade_interior ?? true,
        ufsPriorizadas: savedConfig.ufs_priorizadas || [],
        municipiosPriorizados: (savedConfig as any).municipios_priorizados || {},
        tiposLicitacao: (savedConfig as any).tipos_licitacao || ['compra', 'servico'],
        modalidadesPermitidas: (savedConfig as any).modalidades_permitidas || ['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta'],
      });
    }
  }, [savedConfig]);

  const handleToggleModalidade = (modalidade: string) => {
    setConfigs(prev => {
      const isAdding = !prev.modalidadesPermitidas.includes(modalidade);
      // Garantir que pelo menos uma modalidade esteja selecionada
      if (!isAdding && prev.modalidadesPermitidas.length === 1) {
        return prev;
      }
      return {
        ...prev,
        modalidadesPermitidas: isAdding
          ? [...prev.modalidadesPermitidas, modalidade]
          : prev.modalidadesPermitidas.filter(m => m !== modalidade),
      };
    });
  };

  const handleToggleTipoLicitacao = (tipo: string) => {
    setConfigs(prev => {
      const isAdding = !prev.tiposLicitacao.includes(tipo);
      // Garantir que pelo menos um tipo esteja selecionado
      if (!isAdding && prev.tiposLicitacao.length === 1) {
        return prev;
      }
      return {
        ...prev,
        tiposLicitacao: isAdding
          ? [...prev.tiposLicitacao, tipo]
          : prev.tiposLicitacao.filter(t => t !== tipo),
      };
    });
  };

  const handleToggleUF = (uf: string) => {
    setConfigs(prev => {
      const isAdding = !prev.ufsPriorizadas.includes(uf);
      const newUFs = isAdding
        ? [...prev.ufsPriorizadas, uf]
        : prev.ufsPriorizadas.filter(u => u !== uf);
      
      // Se removendo UF, remover também os municípios
      const newMunicipios = { ...prev.municipiosPriorizados };
      if (!isAdding) {
        delete newMunicipios[uf];
      }
      
      return {
        ...prev,
        ufsPriorizadas: newUFs,
        municipiosPriorizados: newMunicipios,
      };
    });
    
    // Ao selecionar, automaticamente expande para mostrar as cidades
    setExpandedUFs(prev => {
      const isCurrentlySelected = configs.ufsPriorizadas.includes(uf);
      if (!isCurrentlySelected) {
        // Está sendo adicionado, então expande
        return prev.includes(uf) ? prev : [...prev, uf];
      }
      // Está sendo removido, mantém o estado atual
      return prev;
    });
  };

  const handleToggleMunicipio = (uf: string, municipio: string) => {
    setConfigs(prev => {
      const municipiosUF = prev.municipiosPriorizados[uf] || [];
      const isAdding = !municipiosUF.includes(municipio);
      
      const newMunicipios = {
        ...prev.municipiosPriorizados,
        [uf]: isAdding
          ? [...municipiosUF, municipio]
          : municipiosUF.filter(m => m !== municipio),
      };
      
      // Remover UF do objeto se não tiver mais municípios
      if (newMunicipios[uf].length === 0) {
        delete newMunicipios[uf];
      }
      
      return {
        ...prev,
        municipiosPriorizados: newMunicipios,
      };
    });
  };

  const handleSelectAllMunicipiosUF = (uf: string) => {
    const todosMunicipios = getMunicipiosUF(uf);
    setConfigs(prev => ({
      ...prev,
      municipiosPriorizados: {
        ...prev.municipiosPriorizados,
        [uf]: todosMunicipios,
      },
    }));
  };

  const handleClearMunicipiosUF = (uf: string) => {
    setConfigs(prev => {
      const newMunicipios = { ...prev.municipiosPriorizados };
      delete newMunicipios[uf];
      return {
        ...prev,
        municipiosPriorizados: newMunicipios,
      };
    });
  };

  const handleToggleRegiao = (regiao: string) => {
    const ufsRegiao = TODOS_ESTADOS.filter(e => e.regiao === regiao).map(e => e.uf);
    const todasSelecionadas = ufsRegiao.every(uf => configs.ufsPriorizadas.includes(uf));
    
    if (todasSelecionadas) {
      setConfigs(prev => {
        const newMunicipios = { ...prev.municipiosPriorizados };
        ufsRegiao.forEach(uf => delete newMunicipios[uf]);
        return {
          ...prev,
          ufsPriorizadas: prev.ufsPriorizadas.filter(uf => !ufsRegiao.includes(uf)),
          municipiosPriorizados: newMunicipios,
        };
      });
    } else {
      setConfigs(prev => ({
        ...prev,
        ufsPriorizadas: [...new Set([...prev.ufsPriorizadas, ...ufsRegiao])]
      }));
    }
  };

  const handleSelectAll = () => {
    setConfigs(prev => ({
      ...prev,
      ufsPriorizadas: TODOS_ESTADOS.map(e => e.uf)
    }));
  };

  const handleClearAll = () => {
    setConfigs(prev => ({
      ...prev,
      ufsPriorizadas: [],
      municipiosPriorizados: {},
    }));
  };

  const toggleExpandUF = (uf: string) => {
    setExpandedUFs(prev => 
      prev.includes(uf) ? prev.filter(u => u !== uf) : [...prev, uf]
    );
  };

  const getTotalMunicipiosSelecionados = () => {
    return Object.values(configs.municipiosPriorizados).reduce((acc, arr) => acc + arr.length, 0);
  };

  const handleSave = () => {
    updateConfig.mutate({
      valor_minimo: configs.valorMinimo,
      valor_maximo: configs.valorMaximo,
      margem_minima: configs.margemMinima,
      lance_automatico: configs.lanceAutomatico,
      notificacoes_email: configs.notificacoesEmail,
      notificacoes_push: configs.notificacoesPush,
      notificacoes_telefone: configs.notificacoesTelefone,
      telefone_notificacao: configs.telefoneNotificacao,
      notificacoes_vitoria: configs.notificacoesVitoria,
      notificacoes_derrota: configs.notificacoesDerrota,
      notificacoes_nova_licitacao: configs.notificacoesNovaLicitacao,
      notificacoes_prazo_urgente: configs.notificacoesPrazoUrgente,
      notificacoes_disputa: configs.notificacoesDisputa,
      som_notificacao: configs.somNotificacao,
      captacao_continua: configs.captacaoContinua,
      prioridade_interior: configs.prioridadeInterior,
      ufs_priorizadas: configs.ufsPriorizadas,
      municipios_priorizados: configs.municipiosPriorizados,
      tipos_licitacao: configs.tiposLicitacao,
      modalidades_permitidas: configs.modalidadesPermitidas,
    });
  };

  return (
    <MainLayout title="Configurações">
      <Tabs defaultValue="empresa" className="max-w-6xl">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="w-4 h-4" /> 1. Empresa
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-2">
            <SettingsIcon className="w-4 h-4" /> 2. Sistema
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <FileText className="w-4 h-4" /> 3. Manual
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <Trophy className="w-4 h-4" /> 4. Relatórios
          </TabsTrigger>
          <TabsTrigger value="conectores" className="gap-2">
            <Globe className="w-4 h-4" /> 5. Conectores
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <Shield className="w-4 h-4" /> 6. Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <div className="glass-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Cadastro Profissional da Empresa
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre aqui a empresa que utilizará o sistema. CNPJ, CNAEs, SICAF, certidões,
                certificado digital, Gov.br, papel timbrado e e-mail ficam unificados por empresa.
              </p>
            </div>
            <EmpresasContent />
          </div>
        </TabsContent>

        <TabsContent value="manual"><ManualContent /></TabsContent>
        <TabsContent value="relatorios"><RelatoriosContent /></TabsContent>
        <TabsContent value="conectores"><ConectoresContent /></TabsContent>
        <TabsContent value="admin"><AdminContent /></TabsContent>

        <TabsContent value="sistema">
          <div className="max-w-4xl space-y-8">
        {/* Estados Prioritários */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Estados e Municípios para Captação</h3>
              <p className="text-sm text-muted-foreground">Selecione os estados e opcionalmente filtre por municípios específicos</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <MapPin className="w-3 h-3" />
                {configs.ufsPriorizadas.length} UFs
              </Badge>
              {getTotalMunicipiosSelecionados() > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="w-3 h-3" />
                  {getTotalMunicipiosSelecionados()} cidades
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              <Globe className="w-4 h-4 mr-1" />
              Todos os Estados
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              <X className="w-4 h-4 mr-1" />
              Limpar Tudo
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Clique em um estado para selecioná-lo e ver as cidades disponíveis. 
              Escolha cidades específicas ou deixe em branco para captar todas as licitações do estado.
            </p>
          </div>

          <div className="space-y-4">
            {REGIOES.map(regiao => {
              const estadosRegiao = TODOS_ESTADOS.filter(e => e.regiao === regiao);
              const selecionados = estadosRegiao.filter(e => configs.ufsPriorizadas.includes(e.uf)).length;
              const todosRegiao = selecionados === estadosRegiao.length;
              
              return (
                <div key={regiao} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={todosRegiao}
                      onCheckedChange={() => handleToggleRegiao(regiao)}
                    />
                    <span className="font-medium text-sm">{regiao}</span>
                    <Badge variant="secondary" className="text-xs">
                      {selecionados}/{estadosRegiao.length}
                    </Badge>
                  </div>
                  
                  <div className="ml-6 space-y-2">
                    {estadosRegiao.map(estado => {
                      const isSelected = configs.ufsPriorizadas.includes(estado.uf);
                      const isExpanded = expandedUFs.includes(estado.uf);
                      const municipiosDisponiveis = getMunicipiosUF(estado.uf);
                      const municipiosSelecionados = configs.municipiosPriorizados[estado.uf] || [];
                      
                      return (
                        <Collapsible key={estado.uf} open={isExpanded}>
                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  toggleExpandUF(estado.uf);
                                  // Se está expandindo e não está selecionado, selecionar automaticamente
                                  if (!isExpanded && !isSelected) {
                                    handleToggleUF(estado.uf);
                                  }
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            
                            <Badge
                              variant={isSelected ? "default" : "outline"}
                              className={`cursor-pointer transition-all hover:scale-105 flex items-center gap-1 ${
                                isSelected 
                                  ? 'bg-primary hover:bg-primary/80' 
                                  : 'hover:bg-primary/20'
                              }`}
                              onClick={() => {
                                handleToggleUF(estado.uf);
                                // Ao clicar no badge, sempre expande para mostrar cidades
                                if (!isExpanded) {
                                  toggleExpandUF(estado.uf);
                                }
                              }}
                            >
                              {estado.uf} - {estado.nome}
                              <span className="text-xs opacity-70">(ver cidades)</span>
                            </Badge>
                            
                            {isSelected && municipiosSelecionados.length > 0 && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Building2 className="w-3 h-3" />
                                {municipiosSelecionados.length} cidades selecionadas
                              </Badge>
                            )}
                            
                            {isSelected && municipiosSelecionados.length === 0 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Todas as cidades
                              </Badge>
                            )}
                          </div>
                          
                          <CollapsibleContent className="ml-8 mt-2">
                            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  Cidades de {estado.nome} ({municipiosDisponiveis.length} disponíveis)
                                </p>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleSelectAllMunicipiosUF(estado.uf)}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Selecionar Todas
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleClearMunicipiosUF(estado.uf)}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Limpar
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                                💡 Selecione as cidades específicas onde deseja participar de licitações. 
                                Se nenhuma for selecionada, captaremos todas as licitações do estado.
                              </div>
                              
                              {/* Campo de busca de cidades com contador */}
                              {(() => {
                                const searchTerm = cidadeSearch[estado.uf] || '';
                                const cidadesFiltradas = municipiosDisponiveis.filter(m => 
                                  m.toLowerCase().includes(searchTerm.toLowerCase())
                                );
                                return (
                                  <div className="space-y-2">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Buscar cidade..."
                                        value={searchTerm}
                                        onChange={(e) => setCidadeSearch(prev => ({ ...prev, [estado.uf]: e.target.value }))}
                                        className="pl-9 h-9"
                                      />
                                    </div>
                                    {searchTerm && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <Badge variant="secondary" className="gap-1">
                                          <Search className="w-3 h-3" />
                                          {cidadesFiltradas.length} {cidadesFiltradas.length === 1 ? 'cidade encontrada' : 'cidades encontradas'}
                                        </Badge>
                                        {cidadesFiltradas.length === 0 && (
                                          <span className="text-muted-foreground">Nenhuma cidade corresponde à busca</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              <ScrollArea className="h-48">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {municipiosDisponiveis
                                    .filter(m => m.toLowerCase().includes((cidadeSearch[estado.uf] || '').toLowerCase()))
                                    .map(municipio => (
                                    <div
                                      key={municipio}
                                      onClick={() => handleToggleMunicipio(estado.uf, municipio)}
                                      className={`p-2 rounded-lg border cursor-pointer transition-all text-sm flex items-center gap-2 ${
                                        municipiosSelecionados.includes(municipio)
                                          ? 'border-primary bg-primary/10 text-primary'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                    >
                                      <Checkbox 
                                        checked={municipiosSelecionados.includes(municipio)}
                                        onCheckedChange={() => handleToggleMunicipio(estado.uf, municipio)}
                                      />
                                      <span className="truncate">{municipio}</span>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Políticas de Captação */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Políticas de Captação</h3>
              <p className="text-sm text-muted-foreground">Configure os parâmetros de busca de licitações</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Mínimo (R$)</label>
              <Input
                type="number"
                value={configs.valorMinimo}
                onChange={(e) => setConfigs({ ...configs, valorMinimo: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Máximo (R$)</label>
              <Input
                type="number"
                value={configs.valorMaximo}
                onChange={(e) => setConfigs({ ...configs, valorMaximo: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Margem Mínima (%)</label>
            <Input
              type="number"
              value={configs.margemMinima}
              onChange={(e) => setConfigs({ ...configs, margemMinima: parseInt(e.target.value) })}
              className="max-w-[200px]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Prioridade Interior</p>
              <p className="text-sm text-muted-foreground">Priorizar licitações de municípios do interior</p>
            </div>
            <Switch
              checked={configs.prioridadeInterior}
              onCheckedChange={(checked) => setConfigs({ ...configs, prioridadeInterior: checked })}
            />
          </div>
        </div>

        {/* Tipo de Licitação */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Tipo de Licitação</h3>
              <p className="text-sm text-muted-foreground">Escolha os tipos de licitações que deseja captar</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Selecione <strong>Compra</strong> para licitações de produtos (medicamentos, materiais, equipamentos) 
              ou <strong>Serviço</strong> para licitações de serviços (obras, manutenção, consultoria). Você pode selecionar ambos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => handleToggleTipoLicitacao('compra')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                configs.tiposLicitacao.includes('compra')
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  configs.tiposLicitacao.includes('compra') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Compra</p>
                  <p className="text-sm text-muted-foreground">Produtos e materiais</p>
                </div>
                {configs.tiposLicitacao.includes('compra') && (
                  <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                )}
              </div>
            </div>

            <div 
              onClick={() => handleToggleTipoLicitacao('servico')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                configs.tiposLicitacao.includes('servico')
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  configs.tiposLicitacao.includes('servico') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Serviço</p>
                  <p className="text-sm text-muted-foreground">Obras e prestação</p>
                </div>
                {configs.tiposLicitacao.includes('servico') && (
                  <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {configs.tiposLicitacao.length === 2 ? 'Todos os tipos' : 
               configs.tiposLicitacao.includes('compra') ? 'Apenas Compra' : 'Apenas Serviço'}
            </Badge>
          </div>
        </div>

        {/* Modalidades de Licitação */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '175ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gavel className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Modalidades de Licitação</h3>
              <p className="text-sm text-muted-foreground">Escolha as modalidades que deseja monitorar</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <FileText className="w-3 h-3" />
              {configs.modalidadesPermitidas.length} selecionadas
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Selecione as modalidades que sua empresa está habilitada a participar. 
              Dispensas são ideais para empresas menores, enquanto Pregões e Concorrências exigem mais documentação.
            </p>
          </div>

          <div className="grid gap-3">
            {MODALIDADES_DISPONIVEIS.map(modalidade => (
              <div 
                key={modalidade.id}
                onClick={() => handleToggleModalidade(modalidade.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  configs.modalidadesPermitidas.includes(modalidade.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={configs.modalidadesPermitidas.includes(modalidade.id)}
                    onCheckedChange={() => handleToggleModalidade(modalidade.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{modalidade.nome}</p>
                    <p className="text-sm text-muted-foreground">{modalidade.descricao}</p>
                  </div>
                  {configs.modalidadesPermitidas.includes(modalidade.id) && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setConfigs(prev => ({ ...prev, modalidadesPermitidas: MODALIDADES_DISPONIVEIS.map(m => m.id) }))}
            >
              Selecionar Todas
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setConfigs(prev => ({ ...prev, modalidadesPermitidas: ['Dispensa com Disputa'] }))}
            >
              Apenas Dispensas
            </Button>
          </div>
        </div>

        {/* Automação */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Automação 24/7</h3>
              <p className="text-sm text-muted-foreground">Configure o comportamento automático do sistema</p>
            </div>
            {configs.captacaoContinua && (
              <Badge className="bg-success/20 text-success ml-auto animate-pulse">
                <Globe className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Captação Contínua 24/7</p>
                <p className="text-sm text-muted-foreground">Buscar novas licitações automaticamente a cada hora</p>
              </div>
              <Switch
                checked={configs.captacaoContinua}
                onCheckedChange={(checked) => setConfigs({ ...configs, captacaoContinua: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lance Automático</p>
                <p className="text-sm text-muted-foreground">Enviar lances automaticamente após autorização</p>
              </div>
              <Switch
                checked={configs.lanceAutomatico}
                onCheckedChange={(checked) => setConfigs({ ...configs, lanceAutomatico: checked })}
              />
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="glass-card p-6 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Bell className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Notificações e Alertas</h3>
              <p className="text-sm text-muted-foreground">Configure como e quando deseja receber alertas</p>
            </div>
          </div>

          {/* Canais de Notificação */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Canais de Notificação</h4>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className={`p-4 rounded-lg border-2 transition-all ${
                configs.notificacoesEmail ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="font-medium">Email</span>
                  </div>
                  <Switch
                    checked={configs.notificacoesEmail}
                    onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesEmail: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Receba alertas por email</p>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                configs.notificacoesPush ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <span className="font-medium">Push</span>
                  </div>
                  <Switch
                    checked={configs.notificacoesPush}
                    onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesPush: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Notificações no navegador</p>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                configs.notificacoesTelefone ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    <span className="font-medium">Telefone</span>
                  </div>
                  <Switch
                    checked={configs.notificacoesTelefone}
                    onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesTelefone: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">SMS/WhatsApp para vitórias</p>
              </div>
            </div>

            {configs.notificacoesTelefone && (
              <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                <label className="text-sm font-medium">Número de Telefone (WhatsApp)</label>
                <Input
                  placeholder="+55 (11) 99999-9999"
                  value={configs.telefoneNotificacao}
                  onChange={(e) => setConfigs({ ...configs, telefoneNotificacao: e.target.value })}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Usado para alertas de vitória em licitações</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Tipos de Eventos */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tipos de Eventos</h4>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Vitória em Licitação</p>
                    <p className="text-xs text-muted-foreground">Quando você vencer uma licitação</p>
                  </div>
                </div>
                <Switch
                  checked={configs.notificacoesVitoria}
                  onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesVitoria: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Derrota em Licitação</p>
                    <p className="text-xs text-muted-foreground">Quando perder uma disputa</p>
                  </div>
                </div>
                <Switch
                  checked={configs.notificacoesDerrota}
                  onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesDerrota: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">Nova Licitação</p>
                    <p className="text-xs text-muted-foreground">Quando surgir uma oportunidade</p>
                  </div>
                </div>
                <Switch
                  checked={configs.notificacoesNovaLicitacao}
                  onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesNovaLicitacao: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-sm">Prazo Urgente</p>
                    <p className="text-xs text-muted-foreground">Licitações com menos de 6h</p>
                  </div>
                </div>
                <Switch
                  checked={configs.notificacoesPrazoUrgente}
                  onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesPrazoUrgente: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Gavel className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-sm">Início de Disputa</p>
                    <p className="text-xs text-muted-foreground">Quando a disputa começar</p>
                  </div>
                </div>
                <Switch
                  checked={configs.notificacoesDisputa}
                  onCheckedChange={(checked) => setConfigs({ ...configs, notificacoesDisputa: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  {configs.somNotificacao ? (
                    <Volume2 className="w-5 h-5 text-primary" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">Som de Notificação</p>
                    <p className="text-xs text-muted-foreground">Alerta sonoro para eventos</p>
                  </div>
                </div>
                <Switch
                  checked={configs.somNotificacao}
                  onCheckedChange={(checked) => setConfigs({ ...configs, somNotificacao: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Governança */}
        <div className="glass-card p-6 space-y-4 animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Governança</h3>
              <p className="text-sm text-muted-foreground">Conformidade e segurança</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>Lei 14.133/2021 - Licitações e Contratos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>LGPD - Lei Geral de Proteção de Dados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>Logs auditáveis completos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span>Segregação por empresa</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </Button>
        </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Configuracoes;