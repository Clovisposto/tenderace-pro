import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { PlanilhaCotacao } from '@/components/licitacao/PlanilhaCotacao';

export default function CotacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: licitacao, isLoading } = useQuery({
    queryKey: ['licitacao', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/licitacoes?stage=cotacao')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Cotação
          </Button>
          {licitacao?.edital_url && (
            <a href={licitacao.edital_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir edital
              </Button>
            </a>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando licitação…</p>
        ) : !licitacao ? (
          <p className="text-sm text-destructive">Licitação não encontrada.</p>
        ) : (
          <>
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{licitacao.numero}</h1>
                <Badge variant="outline">{licitacao.status}</Badge>
                <Badge variant="secondary">{licitacao.modalidade}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {licitacao.orgao} • {licitacao.municipio}/{licitacao.uf}
              </p>
              <p className="text-sm">{licitacao.objeto}</p>
            </Card>

            <PlanilhaCotacao
              licitacaoId={licitacao.id}
              itensJaExtraidos={(licitacao as any).itens_extraidos || false}
              licitacaoNumero={licitacao.numero}
              licitacaoStatus={licitacao.status}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
