import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalheCompleto } from '@/components/licitacao/LicitacaoDetalheCompleto';
import { useLicitacoes } from '@/hooks/useLicitacoes';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';
import { Licitacao } from '@/types/licitacao';
import { Briefcase, TrendingUp, FileText, Clock, RefreshCw, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Empreendimentos = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [capturando, setCapturando] = useState(false);
  const { data: licitacoesDB, isLoading, refetch } = useLicitacoes();
  const { data: configuracoes } = useConfiguracoes();

  // Estados prioritários do usuário ou padrão
  const ufsPrioritarias = useMemo(() => {
    return configuracoes?.ufs_priorizadas && configuracoes.ufs_priorizadas.length > 0
      ? configuracoes.ufs_priorizadas
      : ['PA', 'TO', 'GO', 'MA'];
  }, [configuracoes]);

  // Filter by segment and allowed states
  const empreendimentos = useMemo(() => {
    if (!licitacoesDB) return [];
    return licitacoesDB
      .filter(l => l.segmento === 'Empreendimentos' && ufsPrioritarias.includes(l.uf))
      .map(l => ({
        id: l.id,
        numero: l.numero,
        orgao: l.orgao,
        objeto: l.objeto,
        objetoResumido: l.objeto_resumido || l.objeto.substring(0, 100) + '...',
        valor: Number(l.valor),
        modalidade: l.modalidade,
        status: l.status,
        dataAbertura: new Date(l.data_abertura),
        dataLimite: new Date(l.data_limite),
        uf: l.uf,
        municipio: l.municipio,
        segmento: l.segmento,
        portal: l.portal,
        compliance: 'Apta' as const,
        createdAt: new Date(l.created_at),
        updatedAt: new Date(l.updated_at),
        uasg: l.uasg,
        roiScore: l.roi_score || 0,
        riscoScore: l.risco_score || 0,
        editalAnalisado: l.edital_analisado || false,
        editalUrl: l.edital_url,
      }));
  }, [licitacoesDB, ufsPrioritarias]);

  const stats = useMemo(() => ({
    total: empreendimentos.length,
    valorTotal: empreendimentos.reduce((acc, l) => acc + l.valor, 0),
    aguardando: empreendimentos.filter(l => l.status === 'Aguardando Autorização').length,
    porUf: ufsPrioritarias.reduce((acc, uf) => {
      acc[uf] = empreendimentos.filter(l => l.uf === uf).length;
      return acc;
    }, {} as Record<string, number>),
  }), [empreendimentos, ufsPrioritarias]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCapturar = async () => {
    setCapturando(true);
    try {
      const { data, error } = await supabase.functions.invoke('capturar-multiportal', {
        body: { 
          segmento: 'Empreendimentos',
          ufs: ufsPrioritarias
        }
      });

      if (error) throw error;

      toast.success('Captura iniciada!', {
        description: `Buscando licitações de empreendimentos em ${ufsPrioritarias.join(', ')}`
      });
      
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      console.error('Erro ao capturar:', error);
      toast.error('Erro ao iniciar captura');
    } finally {
      setCapturando(false);
    }
  };

  return (
    <MainLayout title="Empreendimentos">
      <div className="space-y-6">
        {/* Header with capture button */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Licitações de Empreendimentos</h2>
            <p className="text-sm text-muted-foreground">
              Captando de {ufsPrioritarias.length} estados: {ufsPrioritarias.slice(0, 4).join(', ')}{ufsPrioritarias.length > 4 ? '...' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/configuracoes">
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="w-4 h-4" />
                Estados
              </Button>
            </Link>
            <Button 
              onClick={handleCapturar} 
              disabled={capturando}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${capturando ? 'animate-spin' : ''}`} />
              {capturando ? 'Capturando...' : 'Capturar Licitações'}
            </Button>
          </div>
        </div>

        {/* States Banner */}
        <div className="glass-card p-4 border-l-4 border-accent">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-accent" />
            <span className="font-semibold text-foreground">Estados Prioritários ({ufsPrioritarias.length} selecionados)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ufsPrioritarias.map(uf => (
              <Badge key={uf} variant="secondary" className="gap-1">
                {uf}: {stats.porUf[uf] || 0} licitações
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Licitações</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold gradient-text">{formatCurrency(stats.valorTotal)}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Autorização</p>
                <p className="text-2xl font-bold">{stats.aguardando}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Briefcase className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estados Ativos</p>
                <p className="text-2xl font-bold">{ufsPrioritarias.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="glass-card p-4 border-l-4 border-accent">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Bens e Serviços Gerais:</span> Inclui material de escritório, limpeza, manutenção, equipamentos e outros serviços não especializados.
          </p>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="glass-card p-12 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Carregando licitações...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {empreendimentos.map((licitacao, index) => (
              <LicitacaoCard
                key={licitacao.id}
                licitacao={licitacao}
                onClick={() => setSelectedLicitacao(licitacao)}
                delay={index * 100}
              />
            ))}
          </div>
        )}

        {!isLoading && empreendimentos.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma licitação de empreendimentos nos estados selecionados.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleCapturar} disabled={capturando}>
                <RefreshCw className={`w-4 h-4 mr-2 ${capturando ? 'animate-spin' : ''}`} />
                Capturar Agora
              </Button>
              <Link to="/configuracoes">
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar estados
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {selectedLicitacao && (
        <LicitacaoDetalheCompleto
          licitacao={selectedLicitacao}
          onClose={() => setSelectedLicitacao(null)}
          onAutorizar={() => setSelectedLicitacao(null)}
        />
      )}
    </MainLayout>
  );
};

export default Empreendimentos;