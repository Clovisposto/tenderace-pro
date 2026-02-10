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
  { keywords: ['licitações', 'licitacoes', 'licitação', 'licitacao', 'buscar licitações'], path: '/licitacoes', label: 'Licitações' },
  { keywords: ['portal', 'bll', 'portal bll'], path: '/portal', label: 'Portal BLL' },
  { keywords: ['empresas', 'empresa', 'cnpj', 'minha empresa', 'cadastro', 'cadastrar empresa'], path: '/empresas', label: 'Cadastro de Empresas' },
  { keywords: ['relatórios', 'relatorios', 'relatório', 'relatorio', 'report'], path: '/relatorios', label: 'Relatórios' },
  { keywords: ['configurações', 'configuracoes', 'config', 'ajustes', 'preferências'], path: '/configuracoes', label: 'Configurações' },
  { keywords: ['manual', 'ajuda', 'help', 'documentação', 'tutorial'], path: '/manual', label: 'Manual' },
  { keywords: ['conectores', 'conector', 'integração', 'integrações', 'integracoes'], path: '/conectores', label: 'Conectores' },
  { keywords: ['participações', 'participacoes', 'minhas participações', 'disputas', 'minhas disputas'], path: '/participacoes', label: 'Minhas Participações' },
  { keywords: ['admin', 'administração', 'administracao', 'painel admin'], path: '/admin', label: 'Admin' },
];

export function useVoiceNavigation() {
  const navigate = useNavigate();

  const tryNavigate = useCallback((text: string): { navigated: boolean; label?: string } => {
    const normalized = text.toLowerCase().trim();

    // Check for navigation intent
    const navPhrases = ['abrir', 'ir para', 'vai para', 'abre', 'mostrar', 'mostra', 'navegar', 'navega', 'vá para', 'va para', 'me leva', 'me leve', 'quero ver', 'quero ir'];
    const hasNavIntent = navPhrases.some(p => normalized.includes(p));

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

  return { tryNavigate, getAvailablePages };
}
