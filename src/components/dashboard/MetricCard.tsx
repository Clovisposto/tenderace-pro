import { forwardRef } from 'react';
import { LucideIcon, FileText, Clock, Zap, Trophy, TrendingUp, PieChart } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  variacao?: number;
  icon: string;
  delay?: number;
}

const iconMap: Record<string, LucideIcon> = {
  FileText,
  Clock,
  Zap,
  Trophy,
  TrendingUp,
  PieChart,
};

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, variacao, icon, delay = 0 }, ref) => {
    const Icon = iconMap[icon] || FileText;
    
    return (
      <div 
        ref={ref}
        className="metric-card animate-slide-up opacity-0"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        {variacao !== undefined && (
          <div className="mt-4 flex items-center gap-2">
            <span className={`text-sm font-medium ${variacao >= 0 ? 'text-success' : 'text-destructive'}`}>
              {variacao >= 0 ? '+' : ''}{variacao}%
            </span>
            <span className="text-xs text-muted-foreground">vs. semana anterior</span>
          </div>
        )}
      </div>
    );
  }
);

MetricCard.displayName = 'MetricCard';
