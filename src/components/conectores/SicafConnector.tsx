import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Lock,
  FileCheck,
  Building,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ConnectorStatus {
  version: string;
  enabled: boolean;
  hasCredentials: boolean;
  credentialType: string;
  capabilities: string[];
  limitations: string[];
  documentation: string;
}

interface CertidaoResult {
  tipo: string;
  situacao: 'Regular' | 'Vencida' | 'Pendente' | 'Não Encontrada';
  validade?: string;
  observacao?: string;
}

export function SicafConnector() {
  const [cnpjInput, setCnpjInput] = useState('');
  const queryClient = useQueryClient();

  // Fetch connector status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['sicaf-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sicaf-connector', {
        body: { action: 'status' }
      });
      
      if (error) throw error;
      return data as { success: boolean; connector: ConnectorStatus };
    },
    retry: 1,
  });

  // Test connection mutation
  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sicaf-connector', {
        body: { action: 'test_connection' }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao testar conexão: ' + error.message);
    },
  });

  // Consultar certidões mutation
  const consultarCertidoes = useMutation({
    mutationFn: async (cnpj: string) => {
      const { data, error } = await supabase.functions.invoke('sicaf-connector', {
        body: { action: 'consultar_certidoes', cnpj }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Certidões consultadas com sucesso');
        queryClient.invalidateQueries({ queryKey: ['sicaf-certidoes'] });
      } else {
        toast.error(data.message || 'Erro na consulta');
      }
    },
    onError: (error: any) => {
      if (error.message?.includes('503')) {
        toast.info('Conector SICAF está pronto mas desativado. Aguardando certificado digital.');
      } else {
        toast.error('Erro ao consultar certidões: ' + error.message);
      }
    },
  });

  const connector = status?.connector;
  const isEnabled = connector?.enabled || false;
  const hasCredentials = connector?.hasCredentials || false;

  const formatCNPJ = (value: string) => {
    const nums = value.replace(/\D/g, '');
    return nums
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpjInput(formatCNPJ(e.target.value));
  };

  const getStatusBadge = () => {
    if (isEnabled && hasCredentials) {
      return <Badge className="badge-vencida gap-1"><CheckCircle className="w-3 h-3" /> Ativo</Badge>;
    }
    if (hasCredentials) {
      return <Badge className="badge-aguardando gap-1"><AlertTriangle className="w-3 h-3" /> Pronto</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" /> Desativado</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Connector Status Card */}
      <Card className="bll-card">
        <CardHeader className="bll-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Conector SICAF</CardTitle>
                <CardDescription>
                  Sistema de Cadastramento Unificado de Fornecedores
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Status Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Versão</p>
              <p className="font-medium">{connector?.version || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Tipo de Credencial</p>
              <p className="font-medium capitalize">
                {connector?.credentialType?.replace('_', ' ') || 'Nenhum'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="font-medium">
                {isEnabled ? 'Ativo' : hasCredentials ? 'Pronto para Ativação' : 'Aguardando Credenciais'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Capabilities */}
          {connector?.capabilities && (
            <div>
              <p className="text-sm font-medium mb-2">Funcionalidades</p>
              <div className="flex flex-wrap gap-2">
                {connector.capabilities.map((cap, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1 text-success" />
                    {cap.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Limitations */}
          {connector?.limitations && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Limitações
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {connector.limitations.map((lim, i) => (
                  <li key={i}>• {lim}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
              Atualizar Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnection.mutate()}
              disabled={testConnection.isPending}
            >
              <Lock className="w-4 h-4 mr-2" />
              Testar Conexão
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(connector?.documentation || 'https://www.gov.br/compras/pt-br/sistemas/sicaf', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consulta de Certidões */}
      <Card className="bll-card">
        <CardHeader className="bll-card-header">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Consulta de Certidões
          </CardTitle>
          <CardDescription>
            Verificar situação cadastral e certidões de uma empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="cnpj" className="text-sm">CNPJ da Empresa</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={handleCNPJChange}
                className="mt-1"
                maxLength={18}
              />
            </div>
            <Button
              onClick={() => consultarCertidoes.mutate(cnpjInput)}
              disabled={!cnpjInput || cnpjInput.length < 18 || consultarCertidoes.isPending}
            >
              {consultarCertidoes.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileCheck className="w-4 h-4 mr-2" />
              )}
              Consultar
            </Button>
          </div>

          {/* Certidões Result */}
          {consultarCertidoes.data?.data?.certidoes && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Resultado da Consulta</p>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {consultarCertidoes.data.data.certidoes.map((cert: CertidaoResult, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{cert.tipo}</p>
                        {cert.validade && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Válido até: {new Date(cert.validade).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {cert.observacao && (
                          <p className="text-xs text-muted-foreground">{cert.observacao}</p>
                        )}
                      </div>
                      <Badge className={
                        cert.situacao === 'Regular' ? 'badge-vencida' :
                        cert.situacao === 'Vencida' ? 'badge-perdida' :
                        cert.situacao === 'Pendente' ? 'badge-aguardando' :
                        'badge-cancelada'
                      }>
                        {cert.situacao}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Building className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Sobre o SICAF</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O SICAF é o sistema oficial do Governo Federal para cadastramento de fornecedores.
                  A integração completa requer certificado digital e-CNPJ ou e-CPF válido.
                  Esta consulta utiliza dados públicos disponíveis quando o conector está ativo.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credentials Configuration */}
      <Card className="bll-card">
        <CardHeader className="bll-card-header">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Configuração de Credenciais
          </CardTitle>
          <CardDescription>
            Configure as credenciais para ativar o conector SICAF
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <p className="text-sm">
              Para ativar o conector SICAF, configure as seguintes secrets no projeto:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-background border">
                <code className="text-xs font-mono">SICAF_USER</code>
                <Badge variant="outline" className="text-xs">Opcional</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background border">
                <code className="text-xs font-mono">SICAF_CERTIFICADO</code>
                <Badge variant="outline" className="text-xs">Recomendado</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O certificado digital (e-CNPJ ou e-CPF) é necessário para consultas autenticadas.
              A integração manual deve ser realizada seguindo as diretrizes do gov.br.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}