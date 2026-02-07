import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLicitacoes, type Licitacao } from '@/hooks/useLicitacoes';
import { LicitacaoDetalheCompleto } from '@/components/licitacao/LicitacaoDetalheCompleto';
import { 
  FileSearch, CheckCircle2, AlertTriangle, Clock, Building2, MapPin, 
  DollarSign, Shield, ArrowRight 
} from 'lucide-react';

export function AnaliseEditalTab() {
  const { data: licitacoes, isLoading } = useLicitacoes();
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todas');

  const licitacoesParaAnalise = useMemo(() => {
    if (!licitacoes) return [];
    let result = licitacoes.filter(l => ['Nova', 'Em Análise', 'Aguardando Autorização'].includes(l.status));
    if (filterStatus === 'novas') result = result.filter(l => l.status === 'Nova');
    else if (filterStatus === 'analise') result = result.filter(l => l.status === 'Em Análise');
    else if (filterStatus === 'aguardando') result = result.filter(l => l.status === 'Aguardando Autorização');
    return result;
  }, [licitacoes, filterStatus]);

  const counts = useMemo(() => ({
    todas: licitacoes?.filter(l => ['Nova','Em Análise','Aguardando Autorização'].includes(l.status)).length || 0,
    novas: licitacoes?.filter(l => l.status === 'Nova').length || 0,
    analise: licitacoes?.filter(l => l.status === 'Em Análise').length || 0,
    aguardando: licitacoes?.filter(l => l.status === 'Aguardando Autorização').length || 0,
  }), [licitacoes]);

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
        <h2 className="text-xl font-bold">Análise de Edital e Documentos</h2>
        <p className="text-sm text-muted-foreground">Analise editais, verifique compliance e autorize participação</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'todas', label: 'Total', count: counts.todas, icon: FileSearch, color: 'text-primary' },
          { key: 'novas', label: 'Novas', count: counts.novas, icon: Clock, color: 'text-blue-600' },
          { key: 'analise', label: 'Em Análise', count: counts.analise, icon: AlertTriangle, color: 'text-amber-600' },
          { key: 'aguardando', label: 'Aguardando', count: counts.aguardando, icon: Shield, color: 'text-green-600' },
        ].map(item => (
          <Card 
            key={item.key}
            className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === item.key ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilterStatus(item.key)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <item.icon className={`w-8 h-8 ${item.color}`} />
              <div>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : licitacoesParaAnalise.length > 0 ? (
        <div className="space-y-3">
          {licitacoesParaAnalise.map(l => (
            <Card key={l.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedLicitacao(l)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{l.portal}</Badge>
                      <Badge variant="secondary" className="text-xs">{l.modalidade}</Badge>
                      <Badge className={`text-xs ${
                        l.status === 'Nova' ? 'bg-blue-500/10 text-blue-600' :
                        l.status === 'Em Análise' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-green-500/10 text-green-600'
                      }`}>{l.status}</Badge>
                      <Badge variant="outline" className="text-xs">{l.segmento}</Badge>
                    </div>
                    <p className="font-medium line-clamp-2">{l.objeto_resumido || l.objeto}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{l.orgao}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{l.municipio}/{l.uf}</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />R$ {l.valor.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {l.edital_analisado && <Badge className="bg-green-500/10 text-green-600 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Analisado</Badge>}
                    <Button size="sm" variant="outline" className="gap-1">
                      Analisar <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileSearch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma licitação pendente de análise</p>
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
