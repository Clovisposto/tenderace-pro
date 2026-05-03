import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, ExternalLink, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const MODALIDADES: Record<string, string> = {
  '1': 'Leilão eletrônico', '2': 'Diálogo competitivo', '3': 'Concurso',
  '4': 'Concorrência eletrônica', '5': 'Concorrência presencial',
  '6': 'Pregão eletrônico', '7': 'Pregão presencial',
  '8': 'Dispensa', '9': 'Inexigibilidade', '10': 'Manifestação de interesse',
};

export function PNCPConsultaPanel() {
  const [modalidade, setModalidade] = useState('6');
  const [dias, setDias] = useState(30);
  const [tamanho, setTamanho] = useState(20);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const consultar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('consultar-pncp', {
        method: 'GET' as any,
        body: undefined,
        // pass query via URL using fetch fallback
      } as any);
      // Fallback direct fetch (invoke doesn't expose query params cleanly)
      const url = `https://ccsmnqqwobrsvepwacrg.supabase.co/functions/v1/consultar-pncp?modalidade=${modalidade}&dias=${dias}&tamanho=${tamanho}`;
      const r = await fetch(url);
      const json = await r.json();
      if (json.status !== 'ok') throw new Error(json.erro || 'Erro');
      setResultado(json);
      toast.success(`${json.dados?.length || 0} licitações carregadas`);
    } catch (e: any) {
      toast.error('Erro ao consultar PNCP', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" /> Consulta PNCP (API Oficial)
        </CardTitle>
        <CardDescription>
          Consulta direta ao Portal Nacional de Contratações Públicas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Modalidade</Label>
            <select
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {Object.entries(MODALIDADES).map(([k, v]) => (
                <option key={k} value={k}>{k} - {v}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Últimos dias</Label>
            <Input type="number" min={1} max={365} value={dias} onChange={(e) => setDias(+e.target.value)} />
          </div>
          <div>
            <Label>Resultados</Label>
            <Input type="number" min={1} max={500} value={tamanho} onChange={(e) => setTamanho(+e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={consultar} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Consultar
            </Button>
          </div>
        </div>

        {resultado && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Total: {resultado.total ?? '?'}</Badge>
              <Badge variant="outline">Exibindo: {resultado.dados?.length || 0}</Badge>
              <Badge>{resultado.fonte}</Badge>
            </div>
            <ScrollArea className="h-[400px] border rounded-md p-3">
              <div className="space-y-2">
                {resultado.dados?.map((item: any, i: number) => (
                  <div key={i} className="border rounded-md p-3 text-sm hover:bg-muted/50">
                    <div className="font-medium line-clamp-2">{item.objetoCompra || item.objeto || 'Sem descrição'}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                      <span>Órgão: {item.orgaoEntidade?.razaoSocial || '—'}</span>
                      <span>UF: {item.unidadeOrgao?.ufSigla || '—'}</span>
                      <span>Valor: R$ {Number(item.valorTotalEstimado || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    {item.linkSistemaOrigem && (
                      <a
                        href={item.linkSistemaOrigem}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary inline-flex items-center gap-1 mt-1"
                      >
                        Abrir no portal <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
                {(!resultado.dados || resultado.dados.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhum resultado encontrado
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
