import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Download, 
  FileText, 
  Search, 
  Filter, 
  Bell, 
  Shield, 
  Database, 
  Zap,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings,
  Users,
  Building,
  MapPin,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const Manual = () => {
  const handleExportPDF = () => {
    toast.info('Gerando PDF do manual...');
    // In a real implementation, this would generate a PDF
    setTimeout(() => {
      toast.success('Manual exportado com sucesso!');
    }, 1500);
  };

  return (
    <MainLayout title="Manual do Sistema">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Manual do Usuário
            </h1>
            <p className="text-muted-foreground mt-1">
              Guia completo do Sistema de Gestão de Licitações
            </p>
          </div>
          <Button onClick={handleExportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bll-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Captura 24/7</p>
                  <p className="text-xs text-muted-foreground">Monitoramento automático</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bll-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium">Lei 14.133/2021</p>
                  <p className="text-xs text-muted-foreground">100% em conformidade</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bll-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">PNCP Oficial</p>
                  <p className="text-xs text-muted-foreground">Fonte de dados pública</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Content */}
        <Card className="bll-card">
          <CardHeader className="bll-card-header">
            <CardTitle className="text-lg">Índice do Manual</CardTitle>
            <CardDescription>Navegue pelos tópicos abaixo</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {/* Introdução */}
              <AccordionItem value="intro" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium">1. Introdução ao Sistema</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    O Sistema de Gestão de Licitações é uma plataforma automatizada para monitoramento 
                    e gestão de licitações públicas, com foco em dispensas de licitação (valores até R$ 35.000).
                  </p>
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">Principais funcionalidades:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Captura automática 24/7 do portal PNCP</li>
                      <li>Filtros avançados por modalidade, UF, cidade e período</li>
                      <li>Análise de editais com inteligência artificial</li>
                      <li>Gestão de propostas e cotações</li>
                      <li>Notificações de novas oportunidades</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Portal de Licitações */}
              <AccordionItem value="portal" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-primary" />
                    <span className="font-medium">2. Portal de Licitações</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    O Portal de Licitações é a tela principal do sistema, onde você pode visualizar 
                    e filtrar todas as oportunidades capturadas.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-foreground mb-2">Abas disponíveis:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">Processos</span>
                          </div>
                          <p className="text-xs">Todas as licitações (geral)</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">Compra Direta</span>
                          </div>
                          <p className="text-xs">Apenas compras diretas</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">Por Localização</span>
                          </div>
                          <p className="text-xs">Busca por UF e cidade</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-foreground mb-2">Filtros disponíveis:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Promotor:</strong> Nome do órgão/entidade</li>
                        <li><strong>Nº Edital:</strong> Número do processo</li>
                        <li><strong>Cidade:</strong> Município da licitação</li>
                        <li><strong>Estado:</strong> UF (dropdown)</li>
                        <li><strong>Modalidade:</strong> Tipo de dispensa</li>
                        <li><strong>Situação:</strong> Status atual</li>
                        <li><strong>Período:</strong> Data de publicação</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Status das Licitações */}
              <AccordionItem value="status" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="font-medium">3. Status das Licitações</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>Cada licitação possui um status que indica sua situação atual:</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-nova">Nova</Badge>
                      <span>Licitação recém-capturada, aguardando análise</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-analise">Em Análise</Badge>
                      <span>Sendo avaliada pela equipe</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-aguardando">Aguardando</Badge>
                      <span>Pendente de autorização para participar</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-autorizada">Autorizada</Badge>
                      <span>Aprovada para envio de proposta</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-disputa">Em Disputa</Badge>
                      <span>Fase de lances em andamento</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-vencida">Vencida</Badge>
                      <span>Empresa vencedora do certame</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-perdida">Perdida</Badge>
                      <span>Não vencemos o certame</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-secondary/30">
                      <Badge className="badge-cancelada">Cancelada</Badge>
                      <span>Licitação cancelada ou desistência</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Captura Automática */}
              <AccordionItem value="captura" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-primary" />
                    <span className="font-medium">4. Captura Automática 24/7</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    O sistema executa capturas automáticas a cada hora, buscando novas 
                    licitações no Portal Nacional de Contratações Públicas (PNCP).
                  </p>
                  
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">Política de captura:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Modalidades:</strong> Dispensa com/sem disputa, Compra direta</li>
                      <li><strong>Valores:</strong> R$ 1.000 a R$ 35.000</li>
                      <li><strong>Segmentos:</strong> Medicamentos e Empreendimentos</li>
                      <li><strong>Frequência:</strong> A cada hora (minuto 0)</li>
                    </ul>
                  </div>

                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Importante</p>
                        <p className="text-xs">
                          A captura utiliza apenas dados públicos disponíveis na API do PNCP. 
                          Não são realizados acessos autenticados ou automatização de login.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Painel Admin */}
              <AccordionItem value="admin" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-primary" />
                    <span className="font-medium">5. Painel Administrativo</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    O painel administrativo permite monitorar o sistema e executar ações de manutenção.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-foreground mb-2">Funcionalidades:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Tempo Real:</strong> Monitor de eventos em tempo real</li>
                        <li><strong>Serviços:</strong> Status dos serviços do sistema</li>
                        <li><strong>Cron Jobs:</strong> Histórico de execuções automáticas</li>
                        <li><strong>Logs:</strong> Registro de atividades</li>
                        <li><strong>Segurança:</strong> Conformidade e auditoria</li>
                      </ul>
                    </div>

                    <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">Captura Manual</p>
                          <p className="text-xs">
                            Você pode executar uma captura imediata clicando em "Executar" 
                            na seção de Ações Rápidas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Empresas */}
              <AccordionItem value="empresas" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-primary" />
                    <span className="font-medium">6. Gestão de Empresas</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    Cadastre e gerencie as empresas que participarão das licitações.
                    Clique numa empresa para ver todos os detalhes e completar informações pendentes.
                  </p>
                  
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">Dados da empresa (Lei 14.133/2021):</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>CNPJ, Razão Social e Nome Fantasia</li>
                      <li>Endereço completo (Município/UF)</li>
                      <li>Segmento de atuação (Medicamentos / Empreendimentos)</li>
                      <li>CNAE — Código e descrição da atividade econômica</li>
                      <li>Certificado Digital (A1 ou A3) com validade e emissor</li>
                      <li>Conta Gov.br vinculada</li>
                      <li>Status SICAF (Regular / Pendente / Irregular)</li>
                      <li>Certidões válidas (Fiscal, Trabalhista, FGTS)</li>
                      <li>Licença Farmacêutica / AFE Anvisa (se Medicamentos)</li>
                    </ul>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">🤖 IA Preencher (Busca Automática):</p>
                    <p className="text-xs">
                      Ao abrir os detalhes de uma empresa, clique no botão "IA Preencher" para que 
                      a inteligência artificial busque automaticamente dados da empresa pelo CNPJ, 
                      preenchendo campos vazios como Razão Social, CNAE, endereço e contatos.
                    </p>
                  </div>

                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">Painel de Habilitação:</p>
                    <p className="text-xs">
                      Cada empresa mostra um resumo visual de habilitação indicando se está APTA 
                      ou com PENDÊNCIAS. O robô só participará de licitações quando todos os itens 
                      estiverem verificados (Gov.br, SICAF, Certificado, Certidões, CNAE).
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Controle por Voz */}
              <AccordionItem value="voz" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="font-medium">6.1 Gerente Digital (Controle por Voz)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    O Gerente Digital é um assistente de voz que permite controlar todo o sistema 
                    falando em português. Ele funciona 24 horas e alerta sobre novas licitações.
                  </p>

                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">Como usar:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Clique no botão de microfone (canto inferior direito)</li>
                      <li>Fale naturalmente em português</li>
                      <li>O sistema responde por voz automaticamente</li>
                    </ul>
                  </div>

                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">Comandos disponíveis:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>"Abrir empresas"</strong> — navega para cadastro de empresas</li>
                      <li><strong>"Mostrar licitações"</strong> — abre o portal de licitações</li>
                      <li><strong>"Ver relatórios"</strong> — vai para os relatórios</li>
                      <li><strong>"Abrir configurações"</strong> — abre as configurações</li>
                      <li><strong>"O que é SICAF?"</strong> — a IA explica por voz</li>
                      <li><strong>"Ler para mim"</strong> — a IA lê as informações da tela</li>
                      <li>Qualquer pergunta sobre licitações, a IA responde</li>
                    </ul>
                  </div>

                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Permissão de Microfone</p>
                        <p className="text-xs">
                          O navegador pedirá permissão para usar o microfone na primeira vez. 
                          É necessário permitir para que o controle por voz funcione.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Conformidade */}
              <AccordionItem value="compliance" className="border-b border-border px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-medium">7. Conformidade Legal</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    O sistema foi desenvolvido em conformidade com a legislação brasileira:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="font-medium text-foreground">Lei 14.133/2021</span>
                      </div>
                      <p className="text-xs">
                        Nova Lei de Licitações e Contratos Administrativos. 
                        O sistema respeita os limites e modalidades definidos.
                      </p>
                    </div>

                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="font-medium text-foreground">LGPD</span>
                      </div>
                      <p className="text-xs">
                        Lei Geral de Proteção de Dados. Apenas dados públicos 
                        são processados. Logs de auditoria são mantidos.
                      </p>
                    </div>

                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="font-medium text-foreground">PNCP</span>
                      </div>
                      <p className="text-xs">
                        Portal Nacional de Contratações Públicas. 
                        Fonte oficial de dados conforme gov.br/pncp.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Conectores */}
              <AccordionItem value="conectores" className="px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-5 h-5 text-primary" />
                    <span className="font-medium">8. Conectores de Portais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  <p>
                    O sistema suporta conectores para diferentes portais de licitação. 
                    Alguns requerem autenticação e estão prontos para ativação futura.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span>PNCP (Dados Abertos)</span>
                      </div>
                      <Badge className="badge-vencida">Ativo</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span>ComprasNet</span>
                      </div>
                      <Badge variant="outline">Pronto</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span>BLL (Bolsa de Licitações)</span>
                      </div>
                      <Badge variant="outline">Pronto</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span>SICAF</span>
                      </div>
                      <Badge variant="outline">Pronto*</Badge>
                    </div>
                  </div>

                  <p className="text-xs italic">
                    * Conectores marcados como "Pronto" estão implementados mas desativados, 
                    aguardando configuração de credenciais quando necessário.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Sistema de Gestão de Licitações • Versão 1.0</p>
          <p className="text-xs mt-1">
            Desenvolvido em conformidade com a Lei 14.133/2021 e LGPD
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Manual;