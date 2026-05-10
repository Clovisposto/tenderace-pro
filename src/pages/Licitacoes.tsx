import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FiltrosLicitacao } from '@/components/licitacao/FiltrosLicitacao';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalheCompleto } from '@/components/licitacao/LicitacaoDetalheCompleto';
import { PlanilhaCotacao } from '@/components/licitacao/PlanilhaCotacao';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLicitacoes, useLicitacoesRealtime, useCapturarPNCP, type Licitacao } from '@/hooks/useLicitacoes';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Download, MapPin, Zap, Globe, Settings, Brain, ShieldCheck, ShieldAlert, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const EMPRESA_ATIVA_KEY = 'licitacoes:empresa_ativa_id';

const STAGE_TO_TAB: Record<string, string> = {
  captacao: 'todas',
  cotacao: 'aguardando',
  disputa: 'disputa',
  sala: 'sala',
};
const TAB_TO_STAGE: Record<string, string> = {
  todas: 'captacao',
  aguardando: 'cotacao',
  disputa: 'disputa',
  sala: 'sala',
};

const Licitacoes = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [filtros, setFiltros] = useState<any>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const stage = searchParams.get('stage') || 'captacao';
  const activeTab = STAGE_TO_TAB[stage] || 'todas';
  const setActiveTab = (t: string) => {
    setSearchParams({ stage: TAB_TO_STAGE[t] || 'captacao' }, { replace: true });
  };

  // GATE_LEGAL: confirmação explícita antes de enviar para cotação
  const [confirmarEnvio, setConfirmarEnvio] = useState<Licitacao | null>(null);
  const [bloqueioCompliance, setBloqueioCompliance] = useState<{ motivo: string } | null>(null);

  const { data: licitacoes, isLoading, refetch } = useLicitacoes();
  const { data: configuracoes } = useConfiguracoes();
  const { data: empresas } = useEmpresas();
  const { setupRealtime } = useLicitacoesRealtime();
  const capturarPNCP = useCapturarPNCP();
  const queryClient = useQueryClient();

  // Empresa ativa selecionada pelo usuário (CNPJ/SICAF de referência para compliance e envio)
  const [empresaAtivaId, setEmpresaAtivaId] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(EMPRESA_ATIVA_KEY) : null)
  );
  const empresaAtiva = useMemo(() => {
    if (!empresas || empresas.length === 0) return undefined;
    return empresas.find(e => e.id === empresaAtivaId) ?? empresas[0];
  }, [empresas, empresaAtivaId]);
  useEffect(() => {
    if (empresas && empresas.length > 0 && !empresas.find(e => e.id === empresaAtivaId)) {
      const id = empresas[0].id;
      setEmpresaAtivaId(id);
      try { localStorage.setItem(EMPRESA_ATIVA_KEY, id); } catch {}
    }
  }, [empresas, empresaAtivaId]);
  const selecionarEmpresa = (id: string) => {
    setEmpresaAtivaId(id);
    try { localStorage.setItem(EMPRESA_ATIVA_KEY, id); } catch {}
    const nome = empresas?.find(e => e.id === id)?.nome;
    if (nome) toast.success(`Empresa ativa: ${nome}`);
  };

  // Verifica compliance SICAF + certidões antes de avançar etapa
  const verificarCompliance = (): { ok: boolean; motivo?: string } => {
    if (!empresaAtiva) return { ok: false, motivo: 'Nenhuma empresa cadastrada. Cadastre sua empresa em "Empresas" antes de participar.' };
    const sicafOk = (empresaAtiva.sicaf_status || '').toLowerCase() === 'apta' || (empresaAtiva.sicaf_status || '').toLowerCase() === 'ativo';
    if (!sicafOk) return { ok: false, motivo: `SICAF: status "${empresaAtiva.sicaf_status || 'pendente'}". Lei 14.133/2021 exige cadastro regular antes da participação.` };
    if (empresaAtiva.sicaf_validade && new Date(empresaAtiva.sicaf_validade) < new Date()) {
      return { ok: false, motivo: 'SICAF vencido. Renove o cadastro antes de enviar para cotação.' };
    }
    if (empresaAtiva.certidoes_validas === false) {
      return { ok: false, motivo: 'Certidões negativas vencidas. Atualize as certidões da empresa.' };
    }
    return { ok: true };
  };

  // Estados prioritários do usuário ou padrão
  const ufsPrioritarias = useMemo(() => {
    return configuracoes?.ufs_priorizadas && configuracoes.ufs_priorizadas.length > 0
      ? configuracoes.ufs_priorizadas
      : ['PA', 'TO', 'GO', 'MA'];
  }, [configuracoes]);

  // Mutation para capturar de todos os portais
  const capturarMultiportal = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5min timeout

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capturar-multiportal`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ ufs: ufsPrioritarias }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        // If it's a timeout/network error, the data may still have been saved
        // Refresh the list and show a softer message
        if (err?.name === 'AbortError' || err?.message === 'Failed to fetch') {
          queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
          return { partial: true, message: 'Captura em andamento - dados sendo processados' };
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      if (data?.partial) {
        toast.info('Captura em andamento', {
          description: 'Os dados estão sendo processados em segundo plano. A lista será atualizada automaticamente.',
        });
      } else {
        toast.success(`Capturadas ${data?.total || 0} licitações de ${data?.results?.filter((r: any) => r.success).length || 0} portais`, {
          description: `Estados: ${data?.ufs?.join(', ') || 'Todos'}`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (error) => {
      toast.error('Erro ao capturar licitações', { description: error.message });
      console.error(error);
    }
  });

  // Mutation para detectar método de envio em lote via IA
  const detectarMetodosLote = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada.');

      // Buscar licitações que ainda não foram analisadas (metodo_envio = 'portal' padrão e sem email_destino)
      const { data: pendentes, error } = await supabase
        .from('licitacoes')
        .select('id, numero, metodo_envio, email_destino')
        .eq('metodo_envio', 'portal')
        .is('email_destino', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!pendentes || pendentes.length === 0) {
        return { total: 0, analisadas: 0, emails: 0, resultados: [] };
      }

      const resultados: { numero: string; metodo: string; email?: string; erro?: string }[] = [];
      let emailsEncontrados = 0;

      for (const lic of pendentes) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extrair-metodo-envio`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ licitacao_id: lic.id }),
            }
          );

          if (response.status === 429) {
            resultados.push({ numero: lic.numero, metodo: 'portal', erro: 'Rate limit - tentará novamente depois' });
            break; // Stop on rate limit
          }

          const result = await response.json();
          if (result.success) {
            resultados.push({ numero: lic.numero, metodo: result.metodo_envio, email: result.email_destino });
            if (result.metodo_envio === 'email') emailsEncontrados++;
          } else {
            resultados.push({ numero: lic.numero, metodo: 'portal', erro: result.error });
            // Stop batch on credits exhausted or rate limit signaled via fallback
            if (result.error_code === 'AI_CREDITS_EXHAUSTED' || result.error_code === 'RATE_LIMITED') {
              break;
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
          resultados.push({ numero: lic.numero, metodo: 'portal', erro: 'Erro na requisição' });
        }
      }

      return { total: pendentes.length, analisadas: resultados.length, emails: emailsEncontrados, resultados };
    },
    onSuccess: (data) => {
      if (data.total === 0) {
        toast.info('Todas as licitações já foram analisadas');
      } else {
        toast.success(`${data.analisadas} licitações analisadas`, {
          description: data.emails > 0
            ? `${data.emails} envio(s) por e-mail detectado(s)!`
            : 'Nenhum envio por e-mail detectado',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (error) => {
      toast.error('Erro ao detectar métodos de envio');
      console.error(error);
    },
  });

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  const licitacoesFiltradas = useMemo(() => {
    if (!licitacoes) return [];
    const agora = new Date();
    let result = [...licitacoes];

    // Filtrar apenas licitações dentro do prazo (data_limite > agora)
    result = result.filter(l => new Date(l.data_limite) > agora);

    // Excluir descartadas (Cancelada) de todas as abas
    result = result.filter(l => l.status !== 'Cancelada');

    // Filtrar apenas estados prioritários do usuário
    if (ufsPrioritarias.length > 0) {
      result = result.filter(l => ufsPrioritarias.includes(l.uf));
    }

    if (activeTab === 'todas') {
      // Captação: tudo que ainda NÃO foi enviado para cotação
      result = result.filter(l => !(l as any).enviado_para_cotacao);

      // POLÍTICA DA EMPRESA (Configurações): aplica filtros automáticos
      const valorMin = configuracoes?.valor_minimo ?? 0;
      const valorMax = configuracoes?.valor_maximo ?? Number.MAX_SAFE_INTEGER;
      const modalidadesPermitidas = configuracoes?.modalidades_permitidas as string[] | undefined;
      result = result.filter(l => Number(l.valor) >= Number(valorMin) && Number(l.valor) <= Number(valorMax));
      if (modalidadesPermitidas && modalidadesPermitidas.length > 0) {
        result = result.filter(l => modalidadesPermitidas.includes(l.modalidade as any));
      }
      // Segmento da empresa ativa (Medicamentos / Empreendimentos)
      if (empresaAtiva?.segmento) {
        result = result.filter(l => !l.segmento || l.segmento === empresaAtiva.segmento);
      }
    } else if (activeTab === 'aguardando') {
      // Cotação: enviadas para cotação, aguardando autorização
      result = result.filter(l => (l as any).enviado_para_cotacao && l.status !== 'Em Disputa' && l.status !== 'Autorizada');
    } else if (activeTab === 'disputa') {
      // Disputa: autorizadas, robô preparando/aguardando horário
      result = result.filter(l => l.status === 'Autorizada');
    } else if (activeTab === 'sala') {
      // Sala de Disputa: disputa ativa em tempo real
      result = result.filter(l => l.status === 'Em Disputa');
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      result = result.filter(l =>
        l.objeto.toLowerCase().includes(busca) ||
        l.orgao.toLowerCase().includes(busca) ||
        l.municipio.toLowerCase().includes(busca)
      );
    }

    if (filtros.portais?.length > 0) {
      result = result.filter(l => filtros.portais.includes(l.portal));
    }

    if (filtros.modalidades?.length > 0) {
      result = result.filter(l => filtros.modalidades.includes(l.modalidade));
    }

    if (filtros.ufs?.length > 0) {
      result = result.filter(l => filtros.ufs.includes(l.uf));
    }

    return result;
  }, [activeTab, filtros, licitacoes, ufsPrioritarias, configuracoes, empresaAtiva]);

  // Contagem por estado prioritário
  const countsPorUF = useMemo(() => {
    if (!licitacoes) return {};
    const agora = new Date();
    return ufsPrioritarias.reduce((acc, uf) => {
      acc[uf] = licitacoes.filter(l => l.uf === uf && new Date(l.data_limite) > agora).length;
      return acc;
    }, {} as Record<string, number>);
  }, [licitacoes, ufsPrioritarias]);

  const counts = useMemo(() => {
    const agora = new Date();
    const noPrazo = licitacoes?.filter(l => new Date(l.data_limite) > agora && l.status !== 'Cancelada' && ufsPrioritarias.includes(l.uf)) || [];
    return {
      todas: noPrazo.filter(l => !(l as any).enviado_para_cotacao).length,
      aguardando: noPrazo.filter(l => (l as any).enviado_para_cotacao && l.status !== 'Em Disputa' && l.status !== 'Autorizada').length,
      disputa: noPrazo.filter(l => l.status === 'Autorizada').length,
      sala: noPrazo.filter(l => l.status === 'Em Disputa').length,
    };
  }, [licitacoes, ufsPrioritarias]);

  const mapToLegacyFormat = (l: Licitacao) => ({
    id: l.id,
    portal: l.portal,
    numero: l.numero,
    orgao: l.orgao,
    uasg: l.uasg || undefined,
    municipio: l.municipio,
    uf: l.uf,
    objeto: l.objeto,
    objetoResumido: l.objeto_resumido || l.objeto.substring(0, 60) + '...',
    valor: l.valor,
    modalidade: l.modalidade,
    dataAbertura: new Date(l.data_abertura),
    dataLimite: new Date(l.data_limite),
    status: l.status,
    segmento: l.segmento,
    compliance: 'Apta' as const,
    roiScore: l.roi_score || 70,
    riscoScore: l.risco_score || 20,
    metodoEnvio: (l as any).metodo_envio || 'portal',
    emailDestino: (l as any).email_destino || undefined,
    enviadoParaCotacao: (l as any).enviado_para_cotacao || false,
    createdAt: new Date(l.created_at),
    updatedAt: new Date(l.updated_at),
  });

  const enviarParaCotacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('licitacoes').update({ enviado_para_cotacao: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Enviada para Cotação', { description: 'Abra a aba 2. Cotação para montar a planilha.' });
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const descartarLicitacao = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('licitacao-actions', {
        body: { action: 'descartar', licitacao_id: id, motivo: 'Sem interesse (captação)' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao descartar');
    },
    onSuccess: () => {
      toast.success('Licitação descartada', { description: 'Removida do painel. Registro salvo na auditoria.' });
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
    },
    onError: (e: Error) => toast.error('Erro ao descartar', { description: e.message }),
  });

  return (
    <MainLayout title="Licitações">
      <div className="space-y-6">
        {/* Banner de estados prioritários */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-medium text-primary">Estados Prioritários:</span>
            </div>
            {ufsPrioritarias.map(uf => (
              <Badge key={uf} variant="outline" className="bg-primary/20 border-primary/40 text-primary">
                {uf} ({countsPorUF[uf] || 0})
              </Badge>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Total: {Object.values(countsPorUF).reduce((a, b) => a + b, 0)} licitações
              </span>
              <Link to="/configuracoes">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Settings className="w-4 h-4" />
                  Configurar
                </Button>
              </Link>
            </div>
          </div>
          {configuracoes?.captacao_continua && (
            <div className="mt-2 flex items-center gap-2 text-sm text-success">
              <Zap className="w-4 h-4 animate-pulse" />
              <span>Captura automática 24/7 ativa</span>
              <Globe className="w-3 h-3 ml-2" />
              <span>Atualização a cada hora</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <FiltrosLicitacao onFilterChange={setFiltros} />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Empresa ativa:</span>
              <Select
                value={empresaAtiva?.id ?? ''}
                onValueChange={selecionarEmpresa}
                disabled={!empresas || empresas.length === 0}
              >
                <SelectTrigger className="h-8 w-[260px] border-0 bg-transparent focus:ring-0 px-1">
                  <SelectValue placeholder={empresas?.length ? 'Selecione a empresa' : 'Nenhuma empresa cadastrada'} />
                </SelectTrigger>
                <SelectContent>
                  {empresas?.map(e => {
                    const sicafOk = ['apta', 'ativo'].includes((e.sicaf_status || '').toLowerCase());
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          {sicafOk ? <ShieldCheck className="w-3.5 h-3.5 text-success" /> : <ShieldAlert className="w-3.5 h-3.5 text-destructive" />}
                          <span className="font-medium">{e.nome}</span>
                          <span className="text-xs text-muted-foreground">• {e.cnpj}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => capturarMultiportal.mutate()}
              disabled={capturarMultiportal.isPending}
              className="bg-primary"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${capturarMultiportal.isPending ? 'animate-spin' : ''}`} />
              Capturar Portais ({ufsPrioritarias.length} UFs)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => detectarMetodosLote.mutate()}
              disabled={detectarMetodosLote.isPending}
            >
              <Brain className={`w-4 h-4 mr-2 ${detectarMetodosLote.isPending ? 'animate-pulse' : ''}`} />
              {detectarMetodosLote.isPending ? 'Analisando...' : 'Detectar Métodos (IA)'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {(() => null)()}
          <TabsList className="bg-secondary/50 grid w-full max-w-3xl grid-cols-4 h-auto gap-1.5 p-1.5 rounded-lg">
            {(() => {
              const baseCls = "font-semibold text-white shadow-sm rounded-md py-2.5 transition-all";
              const enabledCls = "!bg-primary hover:!bg-primary/90 data-[state=active]:!bg-primary data-[state=active]:ring-2 data-[state=active]:ring-primary/40 data-[state=active]:ring-offset-1";
              const blockedCls = "!bg-destructive !opacity-100 cursor-not-allowed";
              const cotacaoBlocked = counts.aguardando === 0;
              const disputaBlocked = counts.disputa === 0;
              const salaBlocked = counts.sala === 0;
              return (
                <>
                  <TabsTrigger
                    value="todas"
                    className={`${baseCls} ${enabledCls}`}
                    title="Etapa 1 — Captação de licitações"
                  >
                    1. Captação <span className="ml-2 text-xs opacity-80">({counts.todas})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="aguardando"
                    disabled={cotacaoBlocked}
                    title={cotacaoBlocked ? 'Bloqueada — autorize o envio de uma licitação para Cotação na aba 1. Captação' : 'Etapa 2 — Cotação e formação de preços'}
                    className={`${baseCls} ${cotacaoBlocked ? blockedCls : enabledCls}`}
                  >
                    2. Cotação <span className="ml-2 text-xs opacity-80">({counts.aguardando})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="disputa"
                    disabled={disputaBlocked}
                    title={disputaBlocked ? 'Bloqueada — autorize uma cotação na aba 2. Cotação para liberar a Disputa' : 'Etapa 3 — Preparação para a disputa'}
                    className={`${baseCls} ${disputaBlocked ? blockedCls : enabledCls}`}
                  >
                    3. Disputa <span className="ml-2 text-xs opacity-80">({counts.disputa})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="sala"
                    disabled={salaBlocked}
                    title={salaBlocked ? 'Bloqueada — abre automaticamente quando o pregão entrar em sessão' : 'Etapa 4 — Sala de Disputa ao vivo'}
                    className={`${baseCls} ${salaBlocked ? blockedCls : enabledCls}`}
                  >
                    4. Sala de Disputa <span className="ml-2 text-xs opacity-80">({counts.sala})</span>
                  </TabsTrigger>
                </>
              );
            })()}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {activeTab === 'todas' && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-primary text-sm">Política da empresa aplicada (Etapa 1 — Captação)</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Valor: R$ {Number(configuracoes?.valor_minimo ?? 0).toLocaleString('pt-BR')} – R$ {Number(configuracoes?.valor_maximo ?? 0).toLocaleString('pt-BR')}</Badge>
                  <Badge variant="outline">UFs: {ufsPrioritarias.join(', ')}</Badge>
                  {empresaAtiva?.segmento && <Badge variant="outline">Segmento: {empresaAtiva.segmento}</Badge>}
                  {(configuracoes?.modalidades_permitidas as string[] | undefined)?.map(m => (
                    <Badge key={m} variant="secondary">{m}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas licitações dentro destes critérios aparecem aqui. Para enviar à Cotação é exigida sua autorização explícita
                  (GATE_LEGAL — Lei 14.133/2021) e empresa regular no SICAF.
                </p>
              </div>
            )}
            {activeTab === 'sala' && (
              <div className="mb-4 rounded-lg border-2 border-success/40 bg-success/10 p-4 flex items-center gap-3">
                <Zap className="w-5 h-5 text-success animate-pulse" />
                <div className="flex-1">
                  <p className="font-semibold text-success">Sala de Disputa ao vivo</p>
                  <p className="text-xs text-muted-foreground">
                    Licitações em disputa neste momento. O robô envia lances, anexa documentação de habilitação e
                    acompanha a sessão em tempo real conforme a Lei 14.133/2021.
                  </p>
                </div>
                <Link to="/minhas-participacoes">
                  <Button size="sm" variant="default">Abrir painel completo</Button>
                </Link>
              </div>
            )}
            {activeTab === 'disputa' && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="font-semibold text-primary text-sm">Autorizadas — aguardando horário</p>
                <p className="text-xs text-muted-foreground">
                  Você autorizou a participação. O robô entra automaticamente no horário da abertura.
                  Quando começar, aparece em <b>4. Sala de Disputa</b>.
                </p>
              </div>
            )}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : licitacoesFiltradas.length > 0 ? (
              activeTab === 'aguardando' ? (
                <Accordion type="multiple" className="space-y-3">
                  {licitacoesFiltradas.map((licitacao) => (
                    <AccordionItem
                      key={licitacao.id}
                      value={licitacao.id}
                      className="glass-card border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-col items-start text-left gap-1">
                          <div className="font-semibold">
                            {licitacao.numero} — {licitacao.orgao}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {licitacao.municipio}/{licitacao.uf} • {licitacao.modalidade} •{' '}
                            {licitacao.objeto_resumido || licitacao.objeto?.slice(0, 80)}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex justify-end mb-3">
                          <Button size="sm" variant="outline" onClick={() => setSelectedLicitacao(licitacao)}>
                            Abrir detalhes completos
                          </Button>
                        </div>
                        <PlanilhaCotacao
                          licitacaoId={licitacao.id}
                          itensJaExtraidos={(licitacao as any).itens_extraidos || false}
                          licitacaoNumero={licitacao.numero}
                          licitacaoStatus={licitacao.status}
                          onAutorizado={() => setActiveTab('disputa')}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="space-y-4">
                  {licitacoesFiltradas.map((licitacao, index) => (
                    <LicitacaoCard
                      key={licitacao.id}
                      licitacao={mapToLegacyFormat(licitacao)}
                      onClick={() => setSelectedLicitacao(licitacao)}
                      delay={index * 50}
                      onEnviarParaCotacao={activeTab === 'todas' ? () => {
                        const c = verificarCompliance();
                        if (!c.ok) { setBloqueioCompliance({ motivo: c.motivo! }); return; }
                        setConfirmarEnvio(licitacao);
                      } : undefined}
                      enviarPending={enviarParaCotacao.isPending}
                      onDescartar={activeTab !== 'disputa' ? () => descartarLicitacao.mutate(licitacao.id) : undefined}
                      descartarPending={descartarLicitacao.isPending}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="glass-card p-12 text-center">
                <p className="text-muted-foreground">Nenhuma licitação encontrada para os estados selecionados.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => capturarMultiportal.mutate()}
                    disabled={capturarMultiportal.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${capturarMultiportal.isPending ? 'animate-spin' : ''}`} />
                    Capturar licitações
                  </Button>
                  <Link to="/configuracoes">
                    <Button variant="secondary">
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar estados
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedLicitacao && (
        <LicitacaoDetalheCompleto
          licitacao={mapToLegacyFormat(selectedLicitacao)}
          onClose={() => setSelectedLicitacao(null)}
          onAutorizar={() => setSelectedLicitacao(null)}
        />
      )}

      {/* GATE_LEGAL — Confirmação explícita antes de enviar para Cotação */}
      <AlertDialog open={!!confirmarEnvio} onOpenChange={(o) => !o && setConfirmarEnvio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Autorizar envio para Cotação
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Você está autorizando o envio desta licitação para a etapa <b>2. Cotação</b>.
                  Nenhuma proposta será submetida sem nova autorização sua (Lei 14.133/2021 — princípio da legalidade).
                </p>
                {confirmarEnvio && (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs">
                    <div><b>Nº:</b> {confirmarEnvio.numero}</div>
                    <div><b>Órgão:</b> {confirmarEnvio.orgao}</div>
                    <div><b>Local:</b> {confirmarEnvio.municipio}/{confirmarEnvio.uf}</div>
                    <div><b>Valor estimado:</b> R$ {Number(confirmarEnvio.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Empresa: <b>{empresaAtiva?.nome || '—'}</b> • SICAF: <b>{empresaAtiva?.sicaf_status || '—'}</b>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmarEnvio) enviarParaCotacao.mutate(confirmarEnvio.id);
                setConfirmarEnvio(null);
              }}
            >
              Autorizar e enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bloqueio por compliance (SICAF / certidões) */}
      <AlertDialog open={!!bloqueioCompliance} onOpenChange={(o) => !o && setBloqueioCompliance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Envio bloqueado — compliance
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>{bloqueioCompliance?.motivo}</p>
                <p className="text-xs text-muted-foreground">
                  A Lei 14.133/2021 exige regularidade fiscal e cadastral antes da participação em qualquer fase do certame.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendi</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link to="/empresas">Atualizar empresa</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Licitacoes;