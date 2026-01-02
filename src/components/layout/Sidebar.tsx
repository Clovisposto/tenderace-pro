import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileSearch, 
  Building2, 
  Settings,
  Pill,
  Briefcase,
  Bot,
  BarChart3,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Portal BLL', href: '/portal', icon: Globe },
  { name: 'Licitações', href: '/licitacoes', icon: FileSearch },
  { name: 'Medicamentos', href: '/medicamentos', icon: Pill },
  { name: 'Empreendimentos', href: '/empreendimentos', icon: Briefcase },
  { name: 'Empresas', href: '/empresas', icon: Building2 },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();

  const handleClick = () => {
    onNavigate?.();
  };

  return (
    <aside className="h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">LicitaIA</h1>
            <p className="text-xs text-muted-foreground">Robô de Capital</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleClick}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'text-primary')} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-2">Sistema operando em</p>
          <p className="font-semibold text-sm gradient-text">Modo Automático 24/7</p>
        </div>
      </div>
    </aside>
  );
}
