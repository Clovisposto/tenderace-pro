import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLicitacoes, type Licitacao } from '@/hooks/useLicitacoes';
import { LicitacaoDetalheCompleto } from '@/components/licitacao/LicitacaoDetalheCompleto';
import { 
  FileSignature, Building2, MapPin, DollarSign, Clock, Send, 
  Gavel, ArrowRight, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PropostaTab() {
  const { data: licitacoes, isLoading } = useLicitacoes();
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);

  const autorizadas = useMemo(() => {
    if (!licitacoes) return [];
    return licitacoes.filter(l => l.status === 'Autorizada');
  }, [licitacoes]);

  const mapToLegacy = (l: Licitacao) => ({
    id: l.id, portal: l.portal, numero: l.numero, orgao: l.orgao, uasg: l.uasg || undefined,
    municipio: l.municipio, uf: l.uf, objeto: l.objeto,
    objetoResumido: l.objeto_resumido || l.objeto.substring(0, 60) + '...',
    valor: l.valor, modalidade: l.modalidade, dataAbertura: new Date(l.data_abertura),
    dataLimite: new Date(l.data_limite), status: l.status, segmento: l.segmento,
    compliance: 'Apta' as const, roiScore: l.roi_score || 70, riscoScore: l.risco_score || 20,
    createdAt: new Date(l.created_at), updatedAt: new Date(l.updated_at),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Sala de Propostas</h2>
        <p className="text-sm text-muted-foreground">Prepare e submeta propostas para licitações autorizadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{autorizadas.length}</p>
          <p className="text-xs text-muted-foreground">Autorizadas</p>
        </Card>
        <Card className="p-4 text-center">
          <Send className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-muted-foreground">Propostas Enviadas</p>
        </Card>
        <Card className="p-4 text-center">
          <Gavel className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-muted-foreground">Impugnações</p>
        </Card>
      </div>

      {/* Lista de autorizadas */}
      {isLoading ? (
        <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : autorizadas.length > 0 ? (
        <div className="space-y-3">
          {autorizadas.map(l => (
            <Card key={l.id} className="hover:shadow-md transition-all border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{l.portal}</Badge>
                      <Badge className="bg-primary/10 text-primary text-xs"><Shield className="w-3 h-3 mr-1" />Autorizada</Badge>
                      <Badge variant="outline" className="text-xs">{l.segmento}</Badge>
                    </div>
                    <p className="font-medium line-clamp-2">{l.objeto_resumido || l.objeto}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{l.orgao}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{l.municipio}/{l.uf}</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />R$ {l.valor.toLocaleString('pt-BR')}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(new Date(l.data_limite), "dd/MM HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" onClick={() => setSelectedLicitacao(l)} className="gap-1">
                      <FileSignature className="w-4 h-4" /> Preparar Proposta
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedLicitacao(l)} className="gap-1">
                      Detalhes <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileSignature className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Nenhuma licitação autorizada para proposta</p>
          <p className="text-xs text-muted-foreground">Autorize licitações na aba de Análise para preparar propostas</p>
        </Card>
      )}

      {selectedLicitacao && (
        <LicitacaoDetalheCompleto
          licitacao={mapToLegacy(selectedLicitacao)}
          onClose={() => setSelectedLicitacao(null)}
          onAutorizar={() => setSelectedLicitacao(null)}
        />
      )}
    </div>
  );
}
