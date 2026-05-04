import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SicafConnector } from '@/components/conectores/SicafConnector';
import { SicafDriveConfig } from '@/components/conectores/SicafDriveConfig';
import { BanparaConnector } from '@/components/conectores/BanparaConnector';
import { CaixaConnector } from '@/components/conectores/CaixaConnector';
import { MedicalVMConnector } from '@/components/conectores/MedicalVMConnector';
import { EmailWebhookConfig } from '@/components/integracao/EmailWebhookConfig';
import { 
  Plug, 
  Shield, 
  Globe, 
  Database,
  CheckCircle,
  Clock,
  Lock,
  Building,
  Building2,
  Pill,
  Mail
} from 'lucide-react';

const conectoresDisponiveis = [
  {
    id: 'pncp',
    nome: 'PNCP',
    descricao: 'Portal Nacional de Contratações Públicas',
    status: 'ativo',
    tipo: 'API Pública',
    icon: Globe,
    url: 'https://pncp.gov.br/app/editais',
  },
  {
    id: 'comprasnet',
    nome: 'ComprasNet',
    descricao: 'Portal de Compras do Governo Federal',
    status: 'ativo',
    tipo: 'API Gov.br',
    icon: Database,
    url: 'https://www.gov.br/compras/pt-br/sistemas/conheca-o-compras',
  },
  {
    id: 'bll',
    nome: 'BNC/BLL',
    descricao: 'Bolsa Nacional de Compras',
    status: 'ativo',
    tipo: 'API Autenticada',
    icon: Database,
    url: 'https://bnc.org.br',
  },
  {
    id: 'compraspublicas',
    nome: 'Compras Públicas',
    descricao: 'Portal de Compras Públicas',
    status: 'ativo',
    tipo: 'Web Scraping',
    icon: Globe,
    url: 'https://www.portaldecompraspublicas.com.br',
  },
  {
    id: 'caixa',
    nome: 'Caixa',
    descricao: 'Caixa Econômica Federal - Licitações',
    status: 'pronto',
    tipo: 'API Caixa (Rate Limited)',
    icon: Building,
    url: 'https://licitacoes.caixa.gov.br',
  },
  {
    id: 'bb',
    nome: 'Banco do Brasil',
    descricao: 'Licitações-e - Portal do BB',
    status: 'ativo',
    tipo: 'API Licitações-e',
    icon: Database,
    url: 'https://www.licitacoes-e.com.br',
  },
  {
    id: 'banpara',
    nome: 'Banpará',
    descricao: 'Sistema de Cotações do Banco do Pará',
    status: 'pronto',
    tipo: 'Portal Regional PA',
    icon: Building2,
    url: 'https://cotacao.banpara.b.br/Default.aspx',
  },
  {
    id: 'medicalvm',
    nome: 'MedicalVM',
    descricao: 'Portal Especializado em Medicamentos',
    status: 'pronto',
    tipo: 'Portal Farmacêutico',
    icon: Pill,
    url: 'https://www.medicalvm.com.br',
  },
  {
    id: 'sicaf',
    nome: 'SICAF',
    descricao: 'Sistema de Cadastramento Unificado de Fornecedores',
    status: 'pronto',
    tipo: 'Certificado Digital',
    icon: Shield,
  },
];

export const ConectoresContent = () => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-success/20 text-success gap-1"><CheckCircle className="w-3 h-3" /> Ativo</Badge>;
      case 'pronto':
        return <Badge className="bg-warning/20 text-warning gap-1"><Clock className="w-3 h-3" /> Pronto</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" /> Planejado</Badge>;
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="w-6 h-6 text-primary" />
            Conectores de Portais
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as integrações com portais de licitação - Configure credenciais para ativar capturas
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {conectoresDisponiveis.map((conector) => (
            <Card key={conector.id} className="bll-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    conector.status === 'ativo' ? 'bg-success/10' :
                    conector.status === 'pronto' ? 'bg-warning/10' :
                    'bg-secondary'
                  }`}>
                    <conector.icon className={`w-4 h-4 ${
                      conector.status === 'ativo' ? 'text-success' :
                      conector.status === 'pronto' ? 'text-warning' :
                      'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{conector.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{conector.tipo}</p>
                  </div>
                </div>
                <div className="mt-2">
                  {getStatusBadge(conector.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs for each connector */}
        <Tabs defaultValue="email" className="space-y-4">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="email" className="gap-2 text-xs">
              <Mail className="w-4 h-4" />
              Email/Drive
            </TabsTrigger>
            <TabsTrigger value="banpara" className="gap-2 text-xs">
              <Building2 className="w-4 h-4" />
              Banpará
            </TabsTrigger>
            <TabsTrigger value="caixa" className="gap-2 text-xs">
              <Building className="w-4 h-4" />
              Caixa
            </TabsTrigger>
            <TabsTrigger value="medicalvm" className="gap-2 text-xs">
              <Pill className="w-4 h-4" />
              MedicalVM
            </TabsTrigger>
            <TabsTrigger value="sicaf" className="gap-2 text-xs">
              <Shield className="w-4 h-4" />
              SICAF
            </TabsTrigger>
            <TabsTrigger value="pncp" className="gap-2 text-xs">
              <Globe className="w-4 h-4" />
              PNCP
            </TabsTrigger>
          </TabsList>

          {/* Email/Drive Tab */}
          <TabsContent value="email">
            <EmailWebhookConfig />
          </TabsContent>

          {/* Banpará Tab */}
          <TabsContent value="banpara">
            <BanparaConnector />
          </TabsContent>

          {/* Caixa Tab */}
          <TabsContent value="caixa">
            <CaixaConnector />
          </TabsContent>

          {/* MedicalVM Tab */}
          <TabsContent value="medicalvm">
            <MedicalVMConnector />
          </TabsContent>

          {/* SICAF Tab */}
          <TabsContent value="sicaf" className="space-y-4">
            <SicafDriveConfig />
            <SicafConnector />
          </TabsContent>

          {/* PNCP Tab */}
          <TabsContent value="pncp">
            <Card className="bll-card">
              <CardHeader className="bll-card-header">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Conector PNCP</CardTitle>
                    <CardDescription>
                      Portal Nacional de Contratações Públicas
                    </CardDescription>
                  </div>
                  <Badge className="bg-success/20 text-success ml-auto">Ativo</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Conector Operacional - Captura 24/7</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        O conector PNCP está ativo e funcionando. A captura automática ocorre a cada hora,
                        buscando novas licitações conforme a política configurada.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tipo de Acesso</p>
                          <p className="font-medium">API Pública (Dados Abertos)</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Frequência</p>
                          <p className="font-medium">A cada hora (Cron Job)</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Modalidades</p>
                          <p className="font-medium">Dispensa c/ e s/ Disputa, Compra Direta</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Faixa de Valor</p>
                          <p className="font-medium">R$ 1.000 - R$ 35.000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Conectores;