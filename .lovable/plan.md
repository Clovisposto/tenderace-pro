

# Plano: Unificacao Profissional do LicitaIA em 5 Abas

## Visao Geral

Reestruturar toda a navegacao do sistema em 5 abas principais dentro de uma unica pagina, eliminando a sidebar com muitos itens e criando um fluxo linear e profissional. A IA (Gerente Digital) sera aprimorada para executar acoes reais no sistema via comandos de voz.

## Nova Estrutura de Abas

```text
+-------------------------------------------------------------------+
| LicitaIA - Robo de Capital                              [IA] [Config] |
+-------------------------------------------------------------------+
| [1.Cadastro] [2.Captacao] [3.Analise] [4.Proposta] [5.Participacao] |
+-------------------------------------------------------------------+
|                                                                     |
|                    Conteudo da aba selecionada                       |
|                                                                     |
+-------------------------------------------------------------------+
```

### Aba 1 - Cadastro e Identificacao da Empresa
- Formulario completo de cadastro (nome, CNPJ, razao social, endereco, UF, municipio, telefone, email)
- Campo de **Segmento** (Medicamentos ou Empreendimentos) com opcao de selecao multipla
- Campo de **CNAE** (codigo e descricao da atividade economica)
- Secao de **Politica de Participacao**: UFs prioritarias, modalidades permitidas, faixas de valor (min/max), margem minima
- Secao **Gov.br / Certificado Digital**: campos para registrar dados do certificado digital (tipo A1/A3, validade, emissor)
- Secao **SICAF**: status de habilitacao, data da ultima verificacao, documentos pendentes
- Listagem das empresas ja cadastradas com opcao de editar/excluir
- Sincronizacao visual mostrando status de cada integracao (Gov.br, SICAF, Certificado) com badges de status

### Aba 2 - Captacao / Prospeccao
- Consolida o conteudo atual de "Licitacoes", "Portal BLL", "Medicamentos" e "Empreendimentos" em uma visao unica
- Filtros por UF, portal, modalidade, segmento, valor
- Banner de estados prioritarios (vindo da config da empresa cadastrada)
- Botoes de captura manual (PNCP, Multiportal)
- Cards de licitacoes com status visual
- Feed em tempo real de novas capturas

### Aba 3 - Analise de Edital e Documento
- Lista de licitacoes capturadas que precisam de analise
- Botao "Analisar Edital" que invoca a Edge Function existente
- Exibicao dos resultados: exigencias, criterios, riscos, penalidades
- Verificacao de compliance automatica (SICAF vs requisitos do edital)
- Indicador visual Apta/Inapta
- Botao de "Autorizar Participacao" (GATE_LEGAL) para mover a licitacao para a aba de Proposta

### Aba 4 - Sala de Proposta
- Workflow de 3 etapas existente: Dados, Documentacao, Revisao
- Ferramenta de cotacao com calculo de margem
- Preparacao de documentos (SICAF, Proposta Comercial)
- Submissao da proposta
- Sistema de impugnacao (ImpugnacaoSystem existente)

### Aba 5 - Participacao e Acompanhamento
- Sub-abas: Autorizadas, Em Disputa, Vencidas, Perdidas
- RobotLiveLog para monitoramento ao vivo
- Cards com countdown timer, posicao na disputa
- VencedoraCard com dados do contrato
- Alertas de disputa (DisputeAlertModeSelector)
- KPIs interativos

## IA Gerente Digital - Aprimoramentos

A IA sera capaz de executar acoes alem de apenas navegar:

### Novos Comandos de Voz
| Comando | Acao |
|---------|------|
| "Abra a aba de captacao" | Navega para a aba 2 |
| "Cadastre minha empresa" | Abre aba 1 com formulario ativo |
| "Analise esse edital" | Dispara a analise na aba 3 |
| "Autorize essa licitacao" | Executa o fluxo de autorizacao |
| "Qual meu status no SICAF?" | Consulta e narra o status |
| "Capture licitacoes agora" | Dispara captura multiportal |
| "Quantas disputas ativas?" | Consulta e responde por voz |

### Melhorias na IA
- System prompt atualizado com contexto das 5 abas e capacidade de acoes
- Respostas mais inteligentes usando dados reais do banco (consultas via Edge Function)
- Comportamento proativo: narrar alertas, sugerir acoes, avisar sobre prazos
- Interacao humanizada com confirmacao antes de acoes criticas

## Detalhes Tecnicos

### Migracao de Banco de Dados
- Adicionar colunas na tabela `empresas`: `cnae_codigo`, `cnae_descricao`, `certificado_digital_tipo`, `certificado_digital_validade`, `certificado_digital_emissor`, `govbr_vinculado`, `politica_participacao` (JSONB com UFs, modalidades, valores)
- RLS ja existente cobre as novas colunas

### Arquivos a Criar
- `src/pages/PainelUnificado.tsx` - Pagina principal com as 5 abas
- `src/components/painel/CadastroEmpresaTab.tsx` - Aba 1
- `src/components/painel/CaptacaoTab.tsx` - Aba 2
- `src/components/painel/AnaliseEditalTab.tsx` - Aba 3
- `src/components/painel/PropostaTab.tsx` - Aba 4
- `src/components/painel/ParticipacaoTab.tsx` - Aba 5

### Arquivos a Modificar
- `src/App.tsx` - Rota principal aponta para PainelUnificado
- `src/components/layout/Sidebar.tsx` - Simplificar para apenas: Painel, Relatorios, Config, Admin
- `src/components/ai/VoiceCopilot.tsx` - Adicionar comandos de acao e contexto das abas
- `src/hooks/useVoiceNavigation.ts` - Mapear comandos para as novas abas
- `supabase/functions/ai-assistant/index.ts` - Atualizar system prompt com as 5 abas

### Reutilizacao de Componentes Existentes
Os seguintes componentes serao reutilizados dentro das novas abas sem modificacao:
- `LicitacaoCard`, `FiltrosLicitacao`, `CaptureStatusIndicator` (Aba 2)
- `LicitacaoDetalheCompleto`, `ImpugnacaoSystem` (Abas 3 e 4)
- `ParticipacoesDashboardTab`, `RobotLiveLog`, `VencedoraCard` (Aba 5)
- `DisputeAlertModeSelector`, `VoiceAlertControl` (Aba 5)

### Fluxo de Dados entre Abas
- Aba 1 (Cadastro) alimenta as politicas de filtragem da Aba 2
- Aba 2 (Captacao) alimenta a fila de analise da Aba 3
- Aba 3 (Analise) autoriza e envia para Aba 4 (Proposta)
- Aba 4 (Proposta) submete e move para Aba 5 (Acompanhamento)

