import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SicafConnector } from '@/components/conectores/SicafConnector';
import { 
  Plug, 
  Shield, 
  Globe, 
  Database,
  CheckCircle,
  Clock,
  Lock
} from 'lucide-react';

const conectoresDisponiveis = [
  {
    id: 'pncp',
    nome: 'PNCP',
    descricao: 'Portal Nacional de Contratações Públicas',
    status: 'ativo',
    tipo: 'API Pública',
    icon: Globe,
  },
  {
    id: 'sicaf',
    nome: 'SICAF',
    descricao: 'Sistema de Cadastramento Unificado de Fornecedores',
    status: 'pronto',
    tipo: 'Certificado Digital',
    icon: Shield,
  },
  {
    id: 'comprasnet',
    nome: 'ComprasNet',
    descricao: 'Portal de Compras do Governo Federal',
    status: 'planejado',
    tipo: 'API Autenticada',
    icon: Database,
  },
  {
    id: 'bll',
    nome: 'BLL',
    descricao: 'Bolsa de Licitações e Leilões',
    status: 'planejado',
    tipo: 'API Autenticada',
    icon: Database,
  },
];

const Conectores = () => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="badge-vencida gap-1"><CheckCircle className="w-3 h-3" /> Ativo</Badge>;
      case 'pronto':
        return <Badge className="badge-aguardando gap-1"><Clock className="w-3 h-3" /> Pronto</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" /> Planejado</Badge>;
    }
  };

  return (
    <MainLayout title="Conectores">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="w-6 h-6 text-primary" />
            Conectores de Portais
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as integrações com portais de licitação
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {conectoresDisponiveis.map((conector) => (
            <Card key={conector.id} className="bll-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      conector.status === 'ativo' ? 'bg-success/10' :
                      conector.status === 'pronto' ? 'bg-warning/10' :
                      'bg-secondary'
                    }`}>
                      <conector.icon className={`w-5 h-5 ${
                        conector.status === 'ativo' ? 'text-success' :
                        conector.status === 'pronto' ? 'text-warning' :
                        'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{conector.nome}</p>
                      <p className="text-xs text-muted-foreground">{conector.tipo}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
                    {conector.descricao}
                  </p>
                  {getStatusBadge(conector.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs for each connector */}
        <Tabs defaultValue="sicaf" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="sicaf" className="gap-2">
              <Shield className="w-4 h-4" />
              SICAF
            </TabsTrigger>
            <TabsTrigger value="pncp" className="gap-2">
              <Globe className="w-4 h-4" />
              PNCP
            </TabsTrigger>
            <TabsTrigger value="outros" className="gap-2">
              <Plug className="w-4 h-4" />
              Outros
            </TabsTrigger>
          </TabsList>

          {/* SICAF Tab */}
          <TabsContent value="sicaf">
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
                  <Badge className="badge-vencida ml-auto">Ativo</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Conector Operacional</p>
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

          {/* Outros Tab */}
          <TabsContent value="outros">
            <Card className="bll-card">
              <CardHeader className="bll-card-header">
                <CardTitle className="text-lg">Conectores Planejados</CardTitle>
                <CardDescription>
                  Integrações futuras em desenvolvimento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {conectoresDisponiveis
                    .filter(c => c.status === 'planejado')
                    .map((conector) => (
                      <div key={conector.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                            <conector.icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{conector.nome}</p>
                            <p className="text-xs text-muted-foreground">{conector.descricao}</p>
                          </div>
                        </div>
                        <Badge variant="outline">Planejado</Badge>
                      </div>
                    ))}
                </div>

                <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm">
                    Os conectores planejados serão implementados conforme demanda e disponibilidade
                    de APIs oficiais. Todos seguirão as diretrizes de conformidade (Lei 14.133/2021)
                    e não realizarão automação de login ou bypass de captcha.
                  </p>
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