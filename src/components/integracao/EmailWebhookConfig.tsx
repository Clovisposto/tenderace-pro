import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Mail, 
  Link2, 
  Copy, 
  Check, 
  ExternalLink,
  FileText,
  Building2,
  Pill,
  Webhook,
  Zap,
  CloudCog
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailWebhookConfigProps {
  projectId?: string;
}

export function EmailWebhookConfig({ projectId = 'ccsmnqqwobrsvepwacrg' }: EmailWebhookConfigProps) {
  const [copied, setCopied] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/receber-licitacao-email`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copiada para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  const enviarTeste = async () => {
    setTestLoading(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assunto: 'TESTE - Dispensa de Licitação nº 001/2026',
          remetente: 'compras@prefeitura.gov.br',
          corpo: `
            Prezados,
            
            Informamos a abertura da Dispensa de Licitação nº 001/2026.
            
            Órgão: Prefeitura Municipal de Belém
            Objeto: Aquisição de medicamentos para a rede municipal de saúde
            Valor Estimado: R$ 25.000,00
            Data Limite: 30/01/2026
            
            Atenciosamente,
            Setor de Compras
          `,
          data_recebimento: new Date().toISOString(),
          empresa: 'medicamentos',
          uf: 'PA',
          municipio: 'Belém'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Teste enviado com sucesso! Licitação criada.');
      } else {
        toast.error(`Erro: ${result.error}`);
      }
    } catch (error) {
      toast.error('Erro ao enviar teste. Verifique a conexão.');
      console.error(error);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Integração por Email</CardTitle>
              <CardDescription>
                Configure automações para capturar licitações recebidas por email
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              URL do Webhook
            </Label>
            <div className="flex gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-sm bg-muted"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use esta URL para configurar automações no Zapier, Make ou n8n
            </p>
          </div>

          {/* Empresas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">PARA Medicamentos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure o encaminhamento dos emails de licitações de medicamentos
                </p>
                <Badge className="mt-2" variant="secondary">
                  segmento: medicamentos
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-2 border-accent/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-accent-foreground" />
                  <CardTitle className="text-base">PARA Empreendimentos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure o encaminhamento dos emails de licitações gerais
                </p>
                <Badge className="mt-2" variant="secondary">
                  segmento: empreendimentos
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Teste */}
          <div className="flex justify-end">
            <Button onClick={enviarTeste} disabled={testLoading}>
              {testLoading ? 'Enviando...' : 'Enviar Teste'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações por plataforma */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Configurar</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="zapier">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="zapier" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Zapier
              </TabsTrigger>
              <TabsTrigger value="make" className="flex items-center gap-2">
                <CloudCog className="h-4 w-4" />
                Make
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zapier" className="space-y-4 mt-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertTitle>Configuração Zapier</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Crie um novo Zap no <a href="https://zapier.com" target="_blank" rel="noopener" className="text-primary underline">Zapier</a></li>
                    <li>Adicione o trigger <strong>Gmail: New Email Matching Search</strong></li>
                    <li>Configure filtro: <code className="bg-muted px-1 rounded">subject:(licitação OR dispensa OR pregão)</code></li>
                    <li>Adicione action <strong>Webhooks by Zapier: POST</strong></li>
                    <li>Cole a URL do webhook acima</li>
                    <li>Mapeie os campos do email para o JSON</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Exemplo de mapeamento:</p>
                <pre className="text-xs overflow-auto">
{`{
  "assunto": "{{subject}}",
  "remetente": "{{from_email}}",
  "corpo": "{{body_plain}}",
  "data_recebimento": "{{date}}",
  "empresa": "medicamentos"
}`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="make" className="space-y-4 mt-4">
              <Alert>
                <CloudCog className="h-4 w-4" />
                <AlertTitle>Configuração Make (Integromat)</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Crie um novo cenário no <a href="https://make.com" target="_blank" rel="noopener" className="text-primary underline">Make</a></li>
                    <li>Adicione módulo <strong>Gmail: Watch Emails</strong></li>
                    <li>Configure filtro por assunto/remetente</li>
                    <li>Adicione módulo <strong>HTTP: Make a request</strong></li>
                    <li>URL: cole o webhook acima</li>
                    <li>Método: POST, Body type: JSON</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Envio Manual</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-sm">
                    Você também pode enviar licitações manualmente via API:
                  </p>
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Exemplo cURL:</p>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "numero": "001/2026",
    "orgao": "Prefeitura de Belém",
    "objeto": "Aquisição de medicamentos",
    "valor": 25000,
    "uf": "PA",
    "municipio": "Belém",
    "data_limite": "2026-01-30",
    "segmento": "Medicamentos"
  }'`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Campos aceitos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campos Aceitos pelo Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Campos do Email</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>assunto</code> - Assunto do email</li>
                <li><code>remetente</code> - Email do remetente</li>
                <li><code>corpo</code> - Corpo do email</li>
                <li><code>data_recebimento</code> - Data ISO</li>
                <li><code>empresa</code> - "medicamentos" ou "empreendimentos"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Campos da Licitação (opcional)</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>numero</code> - Número da licitação</li>
                <li><code>orgao</code> - Nome do órgão</li>
                <li><code>objeto</code> - Descrição do objeto</li>
                <li><code>valor</code> - Valor estimado (número)</li>
                <li><code>uf</code> - Sigla do estado</li>
                <li><code>municipio</code> - Nome do município</li>
                <li><code>data_abertura</code> - Data ISO</li>
                <li><code>data_limite</code> - Data ISO</li>
                <li><code>edital_url</code> - Link do edital</li>
                <li><code>drive_links</code> - Array de links do Drive</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
