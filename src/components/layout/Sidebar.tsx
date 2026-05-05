import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Calculator,
  Gavel,
  Settings,
  Bot,
  Trophy,
  Briefcase,
  BookOpen,
  BarChart3,
  Shield,
  Plug,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Estrutura profissional: 3 fluxos de Licitação + Configuração + Administrativo
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'Operação' },

  // Licitação unificada (Captação + Cotação + Sala de Disputa em abas internas)
  { name: 'Licitação', href: '/licitacoes', icon: Gavel, group: 'Licitação', match: '/licitacoes' },
  { name: 'Participações', href: '/participacoes', icon: Trophy, group: 'Licitação' },

  // Configuração unificada (Empresa, Sistema, Manual, Relatórios, Conexões, Admin)
  { name: 'Configuração', href: '/configuracoes', icon: Settings, group: 'Configuração' },

  // Financeiro (unificado: livro caixa, estoque, entradas, saídas e NF-e)
  { name: 'Financeiro', href: '/financeiro', icon: DollarSign, group: 'Financeiro', match: '/financeiro' },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const search = location.search;

  const handleClick = () => onNavigate?.();

  const isItemActive = (item: typeof navigation[number]) => {
    const targetPath = item.match || item.href.split('?')[0];
    if (location.pathname !== targetPath) return false;
    const stageParam = item.href.includes('stage=') ? item.href.split('stage=')[1] : null;
    const tabParam = item.href.includes('tab=') ? item.href.split('tab=')[1] : null;
    if (stageParam) {
      const current = new URLSearchParams(search).get('stage') || 'captacao';
      return current === stageParam;
    }
    if (tabParam) {
      const current = new URLSearchParams(search).get('tab') || 'caixa';
      return current === tabParam;
    }
    return true;
  };

  return (
    <aside className="h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center">
            <Bot className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">LicitaIA</h1>
            <p className="text-xs text-sidebar-foreground/60">Robô de Capital</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {['Operação', 'Licitação', 'Configuração', 'Financeiro'].map((group) => (
          <div key={group} className="mb-3">
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40 uppercase">
              {group}
            </p>
            {navigation.filter((n) => n.group === group).map((item) => {
              const active = isItemActive(item);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={handleClick}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn('w-5 h-5', active && 'text-sidebar-primary')} />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="p-4 rounded-lg bg-sidebar-accent border border-sidebar-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success animate-ping opacity-75" />
            </div>
            <p className="text-xs text-sidebar-foreground/70">Sistema operando em</p>
          </div>
          <p className="font-semibold text-sm text-sidebar-primary">Modo Automático 24/7</p>
        </div>
      </div>
    </aside>
  );
}
