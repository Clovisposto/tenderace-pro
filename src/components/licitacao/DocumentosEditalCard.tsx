import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentoEdital {
  id: string | number;
  nome: string;
  tipo: string;
  url: string;
  dataPublicacao?: string | null;
}

interface DocumentosEditalCardProps {
  numero: string;
  portal: string;
}

export function DocumentosEditalCard({ numero, portal }: DocumentosEditalCardProps) {
  const [documentos, setDocumentos] = useState<DocumentoEdital[]>([]);
  const [portalUrl, setPortalUrl] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocumentos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buscar-documentos-edital`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ numero, portal }),
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success) {
        setDocumentos(data.documentos || []);
        setPortalUrl(data.portalUrl || '');
        setMessage(data.message || '');
      } else {
        setError(data.error || 'Erro ao buscar documentos');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Não foi possível buscar os documentos do portal.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentos();
  }, [numero, portal]);

  const handleDownload = (doc: DocumentoEdital) => {
    window.open(doc.url, '_blank', 'noopener,noreferrer');
    toast.success(`Baixando "${doc.nome}"`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentos do Edital para Download
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDocumentos}
            disabled={isLoading}
            className="gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 space-y-3">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDocumentos}>
              Tentar novamente
            </Button>
          </div>
        ) : documentos.length > 0 ? (
          <div className="space-y-3">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{doc.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.tipo}
                      {doc.dataPublicacao && ` • ${new Date(doc.dataPublicacao).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(doc);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {message || 'Nenhum documento encontrado na API do portal.'}
            </p>
            {portalUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(portalUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-4 h-4" />
                Acessar portal {portal}
              </Button>
            )}
          </div>
        )}

        {documentos.length > 0 && portalUrl && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {documentos.length} documento(s) encontrado(s) no {portal}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => window.open(portalUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-3 h-3" />
              Ver no portal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
