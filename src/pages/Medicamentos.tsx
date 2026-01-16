import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalheCompleto } from '@/components/licitacao/LicitacaoDetalheCompleto';
import { useLicitacoes } from '@/hooks/useLicitacoes';
import { Licitacao } from '@/types/licitacao';
import { Pill, TrendingUp, FileText, Clock, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const UFS_PERMITIDAS = ['PA', 'TO', 'GO', 'MA'];

const Medicamentos = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [capturando, setCapturando] = useState(false);
  const { data: licitacoesDB, isLoading, refetch } = useLicitacoes();

  // Filter by segment and allowed states
  const medicamentos = useMemo(() => {
    if (!licitacoesDB) return [];
    return licitacoesDB
      .filter(l => l.segmento === 'Medicamentos' && UFS_PERMITIDAS.includes(l.uf))
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
  }, [licitacoesDB]);

  const stats = useMemo(() => ({
    total: medicamentos.length,
    valorTotal: medicamentos.reduce((acc, l) => acc + l.valor, 0),
    aguardando: medicamentos.filter(l => l.status === 'Aguardando Autorização').length,
    porUf: UFS_PERMITIDAS.reduce((acc, uf) => {
      acc[uf] = medicamentos.filter(l => l.uf === uf).length;
      return acc;
    }, {} as Record<string, number>),
  }), [medicamentos]);

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
          segmento: 'Medicamentos',
          ufs: UFS_PERMITIDAS
        }
      });

      if (error) throw error;

      toast.success('Captura iniciada!', {
        description: `Buscando licitações de medicamentos em ${UFS_PERMITIDAS.join(', ')}`
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
    <MainLayout title="Medicamentos">
      <div className="space-y-6">
        {/* Header with capture button */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Licitações de Medicamentos</h2>
            <p className="text-sm text-muted-foreground">Captando apenas de: PA, TO, GO, MA</p>
          </div>
          <Button 
            onClick={handleCapturar} 
            disabled={capturando}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${capturando ? 'animate-spin' : ''}`} />
            {capturando ? 'Capturando...' : 'Capturar Licitações'}
          </Button>
        </div>

        {/* States Banner */}
        <div className="glass-card p-4 border-l-4 border-primary">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">Estados Prioritários</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {UFS_PERMITIDAS.map(uf => (
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
                <Pill className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estados Ativos</p>
                <p className="text-2xl font-bold">{UFS_PERMITIDAS.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="glass-card p-4 border-l-4 border-primary">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Segmento Farmacêutico:</span> Somente empresas com licença farmacêutica podem participar. A IA verifica automaticamente a documentação e habilitação técnica.
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
            {medicamentos.map((licitacao, index) => (
              <LicitacaoCard
                key={licitacao.id}
                licitacao={licitacao}
                onClick={() => setSelectedLicitacao(licitacao)}
                delay={index * 100}
              />
            ))}
          </div>
        )}

        {!isLoading && medicamentos.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma licitação de medicamentos nos estados selecionados.</p>
            <Button onClick={handleCapturar} disabled={capturando}>
              <RefreshCw className={`w-4 h-4 mr-2 ${capturando ? 'animate-spin' : ''}`} />
              Capturar Agora
            </Button>
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

export default Medicamentos;
