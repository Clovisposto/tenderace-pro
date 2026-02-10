import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { toast } from 'sonner';

interface NavigationCommand {
  keywords: string[];
  path: string;
  label: string;
}

const NAVIGATION_COMMANDS: NavigationCommand[] = [
  { keywords: ['início', 'inicio', 'dashboard', 'painel', 'home', 'principal'], path: '/', label: 'Dashboard' },
  { keywords: ['licitações', 'licitacoes', 'licitação', 'licitacao', 'buscar licitações', 'portal de licitações', 'portal licitações', 'portal licitacoes'], path: '/licitacoes', label: 'Licitações' },
  { keywords: ['portal', 'bll', 'portal bll', 'portal de captação', 'captação'], path: '/portal', label: 'Portal de Captação' },
  { keywords: ['empresas', 'empresa', 'cnpj', 'minha empresa', 'cadastro', 'cadastrar empresa', 'cadastro empresa'], path: '/empresas', label: 'Cadastro de Empresas' },
  { keywords: ['relatórios', 'relatorios', 'relatório', 'relatorio', 'report', 'ver relatórios'], path: '/relatorios', label: 'Relatórios' },
  { keywords: ['configurações', 'configuracoes', 'config', 'ajustes', 'preferências'], path: '/configuracoes', label: 'Configurações' },
  { keywords: ['manual', 'ajuda', 'help', 'documentação', 'tutorial', 'como usar'], path: '/manual', label: 'Manual' },
  { keywords: ['conectores', 'conector', 'integração', 'integrações', 'integracoes'], path: '/conectores', label: 'Conectores' },
  { keywords: ['participações', 'participacoes', 'minhas participações', 'disputas', 'minhas disputas', 'minhas licitações', 'minhas propostas'], path: '/participacoes', label: 'Minhas Participações' },
  { keywords: ['admin', 'administração', 'administracao', 'painel admin'], path: '/admin', label: 'Admin' },
  { keywords: ['medicamentos', 'remédios', 'remedios', 'fármacos', 'farmacos'], path: '/portal?segmento=medicamentos', label: 'Licitações de Medicamentos' },
  { keywords: ['empreendimentos', 'obras', 'serviços', 'servicos', 'ti', 'tecnologia'], path: '/portal?segmento=empreendimentos', label: 'Licitações de Empreendimentos' },
];

// Action commands the voice copilot can understand
interface ActionCommand {
  keywords: string[];
  action: string;
  label: string;
}

const ACTION_COMMANDS: ActionCommand[] = [
  { keywords: ['ler licitações', 'ler licitacoes', 'leia as licitações', 'leia para mim', 'ler para mim', 'leia tudo', 'ler tudo'], action: 'read_licitacoes', label: 'Ler licitações' },
  { keywords: ['capturar', 'captura', 'buscar novas', 'atualizar licitações', 'capturar novas'], action: 'capture', label: 'Capturar licitações' },
  { keywords: ['exportar', 'exporta', 'baixar csv', 'exportar csv'], action: 'export', label: 'Exportar dados' },
  { keywords: ['filtrar medicamentos', 'só medicamentos', 'somente medicamentos', 'segmento medicamentos'], action: 'filter_medicamentos', label: 'Filtrar medicamentos' },
  { keywords: ['filtrar empreendimentos', 'só empreendimentos', 'somente empreendimentos', 'segmento empreendimentos'], action: 'filter_empreendimentos', label: 'Filtrar empreendimentos' },
  { keywords: ['ver todas', 'mostrar todas', 'todos segmentos', 'limpar filtro'], action: 'filter_all', label: 'Mostrar todas' },
  { keywords: ['quantas licitações', 'quantas licitacoes', 'total de licitações', 'total licitações'], action: 'count_licitacoes', label: 'Contar licitações' },
  { keywords: ['status do robô', 'status robo', 'como está o robô', 'robô está ativo'], action: 'robot_status', label: 'Status do robô' },
  { keywords: ['autorizar', 'autoriza', 'aprovar', 'participar', 'quero participar'], action: 'authorize', label: 'Autorizar participação' },
  { keywords: ['alterar', 'altera', 'mudar', 'trocar', 'editar', 'modificar'], action: 'edit', label: 'Editar' },
];

export function useVoiceNavigation() {
  const navigate = useNavigate();

  const tryNavigate = useCallback((text: string): { navigated: boolean; label?: string; action?: string } => {
    const normalized = text.toLowerCase().trim();

    // Check for navigation intent
    const navPhrases = ['abrir', 'ir para', 'vai para', 'abre', 'mostrar', 'mostra', 'navegar', 'navega', 'vá para', 'va para', 'me leva', 'me leve', 'quero ver', 'quero ir', 'acessar', 'acessa', 'entrar'];
    const hasNavIntent = navPhrases.some(p => normalized.includes(p));

    // Check for action commands first
    for (const cmd of ACTION_COMMANDS) {
      const match = cmd.keywords.some(kw => normalized.includes(kw));
      if (match) {
        return { navigated: false, action: cmd.action, label: cmd.label };
      }
    }

    // Check navigation commands
    for (const cmd of NAVIGATION_COMMANDS) {
      const match = cmd.keywords.some(kw => normalized.includes(kw));
      if (match && (hasNavIntent || cmd.keywords.some(kw => normalized === kw))) {
        navigate(cmd.path);
        toast.success(`Navegando para ${cmd.label}`);
        return { navigated: true, label: cmd.label };
      }
    }

    return { navigated: false };
  }, [navigate]);

  const getAvailablePages = useCallback(() => {
    return NAVIGATION_COMMANDS.map(c => c.label);
  }, []);

  const getAvailableActions = useCallback(() => {
    return ACTION_COMMANDS.map(c => c.label);
  }, []);

  return { tryNavigate, getAvailablePages, getAvailableActions };
}
