import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LicitacaoCard } from '@/components/licitacao/LicitacaoCard';
import { LicitacaoDetalhe } from '@/components/licitacao/LicitacaoDetalhe';
import { mockLicitacoes } from '@/data/mockData';
import { Licitacao } from '@/types/licitacao';
import { Briefcase, TrendingUp, FileText, Clock } from 'lucide-react';

const Empreendimentos = () => {
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);

  const empreendimentos = useMemo(() => {
    return mockLicitacoes.filter(l => l.segmento === 'Empreendimentos');
  }, []);

  const stats = useMemo(() => ({
    total: empreendimentos.length,
    valorTotal: empreendimentos.reduce((acc, l) => acc + l.valor, 0),
    aguardando: empreendimentos.filter(l => l.status === 'Aguardando Autorização').length,
    aptas: empreendimentos.filter(l => l.compliance === 'Apta').length,
  }), [empreendimentos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <MainLayout title="Empreendimentos">
      <div className="space-y-6">
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
                <p className="text-sm text-muted-foreground">Empresas Aptas</p>
                <p className="text-2xl font-bold">{stats.aptas}</p>
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

        {empreendimentos.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma licitação de empreendimentos no momento.</p>
          </div>
        )}
      </div>

      {selectedLicitacao && (
        <LicitacaoDetalhe
          licitacao={selectedLicitacao}
          onClose={() => setSelectedLicitacao(null)}
          onAutorizar={() => setSelectedLicitacao(null)}
        />
      )}
    </MainLayout>
  );
};

export default Empreendimentos;
