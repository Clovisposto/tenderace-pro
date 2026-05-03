import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileSearch, 
  Building2, 
  Settings,
  Bot,
  BarChart3,
  Globe,
  BookOpen,
  Plug,
  Shield,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Portal BLL', href: '/portal', icon: Globe },
  { name: 'Licitações', href: '/licitacoes', icon: FileSearch },
  { name: 'Participações', href: '/participacoes', icon: Trophy },
  { name: 'Conectores', href: '/conectores', icon: Plug },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { name: 'Manual', href: '/manual', icon: BookOpen },
  { name: 'Admin', href: '/admin', icon: Shield },
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
    <aside className="h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0">
      {/* Logo */}
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
              <item.icon className={cn('w-5 h-5', isActive && 'text-sidebar-primary')} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer - Status 24/7 */}
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
