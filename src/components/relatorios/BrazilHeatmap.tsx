import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  ChevronLeft,
  Building2,
  Target,
  DollarSign,
  BarChart3,
  Search,
  ArrowUpDown
} from 'lucide-react';

interface UFData {
  uf: string;
  total: number;
  vitorias: number;
  perdidas: number;
  taxaSucesso: number;
  valorVencido: number;
}

interface MunicipioData {
  municipio: string;
  uf: string;
  total: number;
  vitorias: number;
  perdidas: number;
  taxaSucesso: number;
  valorTotal: number;
  valorVencido: number;
}

interface BrazilHeatmapProps {
  ufData: UFData[];
  municipioData?: MunicipioData[];
  onUFClick?: (uf: string) => void;
  selectedUF?: string | null;
}

// Brazilian states SVG paths
const BRAZIL_STATES: Record<string, { path: string; name: string; cx: number; cy: number }> = {
  AC: { path: "M48.5,198.8l-2.1,3.5l-5.2,1.4l-1.4,2.8l-3.5,0.7l-2.1,2.8l0.7,4.2l2.1,2.1l4.2,1.4l2.1-0.7l2.8,1.4l4.9,0l3.5-2.1l2.1,0.7l2.8-2.1l0-2.8l-1.4-2.1l1.4-3.5l-2.1-2.8l-4.9-1.4l-2.1-2.8L48.5,198.8z", name: "Acre", cx: 42, cy: 208 },
  AL: { path: "M362.8,210.8l3.5-2.1l4.9-1.4l3.5,0l-0.7,4.2l-4.2,2.8l-4.2,0l-2.8-3.5L362.8,210.8z", name: "Alagoas", cx: 368, cy: 210 },
  AM: { path: "M58.9,126.8l4.9,2.1l3.5-1.4l6.3,0.7l4.2,2.8l4.9,0l5.6,3.5l7.7,0l4.2,2.8l5.6,0l4.9,2.8l3.5-1.4l4.9,1.4l4.2-2.1l4.2,0.7l0,4.2l2.8,2.1l0,4.9l4.2,2.1l0,4.9l-1.4,4.2l2.8,2.1l-0.7,4.2l3.5,4.2l-1.4,2.8l4.2,4.9l0,7l-2.1,2.8l1.4,4.2l-2.1,2.8l1.4,4.9l-4.2,0.7l-2.1,3.5l-4.2-0.7l-2.8,2.1l-4.9-0.7l-2.8,2.1l-7,0l-2.8-3.5l-4.2,0l-2.1-4.2l-6.3,0l-2.1,2.1l-4.9,0l-1.4,2.8l-4.2,0l-4.9-2.8l-4.9,2.1l-3.5,4.2l-4.9,0.7l-2.8,2.1l-4.2-2.1l-4.2,0.7l-4.9-2.1l-3.5,2.1l-4.9-0.7l-2.1-4.9l-4.2-0.7l-0.7-4.2l-4.2-2.1l0.7-4.9l-2.8-2.1l2.1-3.5l-1.4-4.2l2.1-2.8l-2.1-4.2l4.2-2.8l2.1-4.2l4.9-2.1l0.7-4.2l4.2-0.7l0-6.3l2.1-2.1l-2.1-4.9l2.8-2.8l4.9-0.7l0.7-4.2l4.2-2.1l0-4.9L58.9,126.8z", name: "Amazonas", cx: 100, cy: 170 },
  AP: { path: "M200.4,98.4l2.8,4.2l4.9,2.1l1.4,4.2l4.2,2.1l-0.7,4.9l-2.8,2.8l0.7,4.2l-2.8,3.5l-4.2-4.9l-4.2,0l-2.8-2.8l-2.8,0.7l-2.1-4.2l0.7-4.2l-2.1-2.8l0-4.9l3.5-4.2l2.1,0l2.1-2.8L200.4,98.4z", name: "Amapá", cx: 198, cy: 112 },
  BA: { path: "M310.8,186.8l2.8-2.1l4.9,0l2.8,2.8l4.2-0.7l2.1,2.8l4.9,0l0.7,4.2l4.2,0l2.8,2.1l4.9-2.1l4.2,0.7l2.8-2.1l4.2,0.7l2.1,2.8l-0.7,4.2l4.2,2.8l-2.1,4.2l0.7,4.9l-2.1,2.8l0.7,4.2l-2.8,2.1l0,4.9l2.8,2.1l-0.7,4.2l-4.2,2.1l-2.1,4.2l-4.2,0.7l-2.8,4.2l-6.3,2.1l-2.1-2.8l-4.9,0l-2.1,2.1l-4.9-0.7l-2.8,2.1l-4.9,0l-2.8-2.1l-4.2,0l-2.1-4.2l-4.9-0.7l-2.1-4.2l0-4.9l-2.8-2.1l0-4.2l-2.8-2.8l0.7-4.2l-2.1-2.8l0.7-4.9l-2.8-2.1l2.1-4.2l-0.7-4.2l2.8-2.8l-0.7-4.2l2.1-2.8l4.2,0.7l2.8-2.1l4.2,0L310.8,186.8z", name: "Bahia", cx: 325, cy: 225 },
  CE: { path: "M336.4,156.4l4.2,2.1l4.9-0.7l2.8,2.8l4.2,0l2.8-2.1l2.8,2.8l-0.7,4.9l2.8,2.1l-1.4,4.2l-4.2,2.1l-4.2-0.7l-2.8,2.8l-4.9-0.7l-2.8,2.1l-4.2-2.8l-4.2,0l-2.1-4.2l0.7-4.9l2.8-2.1l-0.7-4.2l2.8-2.8L336.4,156.4z", name: "Ceará", cx: 345, cy: 168 },
  DF: { path: "M263.2,244.8l2.8,2.1l4.2,0l2.1,2.8l-2.1,2.8l-4.2,0l-2.8-2.1l-2.1-2.8L263.2,244.8z", name: "Distrito Federal", cx: 266, cy: 250 },
  ES: { path: "M336.4,270l2.1,2.8l4.2,0l2.8,2.1l-0.7,4.2l-2.8,2.1l-4.2-0.7l-2.1-2.8l-2.8-0.7l0.7-4.2L336.4,270z", name: "Espírito Santo", cx: 340, cy: 278 },
  GO: { path: "M244.4,226l4.2,0.7l2.8,2.8l4.2,0l2.1,2.8l4.9,0l2.1-2.1l4.2,0.7l2.8,2.8l-0.7,4.2l2.8,2.1l0,4.9l-2.1,2.8l0.7,4.2l-2.8,2.1l-0.7,4.9l-4.2,2.1l-2.8-2.1l-4.2,0.7l-2.8,2.8l-4.2-0.7l-2.1-2.8l-4.9,0l-2.1,2.1l-4.2-0.7l-2.8-2.8l0.7-4.2l-2.8-2.1l0-4.9l2.1-2.8l-0.7-4.2l2.8-2.8l-0.7-4.2l2.8-2.1l0-4.9l4.2,0L244.4,226z", name: "Goiás", cx: 254, cy: 254 },
  MA: { path: "M270.8,134.8l2.8,2.1l4.9,0l2.1,2.8l4.2,0l2.8,2.1l4.2-0.7l2.8,2.8l-0.7,4.2l2.8,2.1l-0.7,4.9l-2.8,2.1l0.7,4.2l-4.2,2.8l-4.2-0.7l-2.8,2.1l-4.9,0l-2.1-2.8l-4.2,0.7l-2.8-2.1l-4.2,0.7l-2.8-2.8l-4.2,0l-2.1,2.8l-4.9-0.7l-2.1-2.8l0.7-4.2l-2.8-2.8l0.7-4.2l-2.8-2.1l2.1-2.8l-0.7-4.9l2.8-2.1l-0.7-4.2l4.2-2.1l4.2,0.7l2.8-2.1l4.9,0.7l2.1,2.8l4.2-0.7L270.8,134.8z", name: "Maranhão", cx: 270, cy: 156 },
  MG: { path: "M280,254.8l2.8,2.1l4.2,0l2.8,2.8l4.2-0.7l2.1,2.8l4.9,0l0.7,4.2l4.2,0l2.8,2.1l-0.7,4.2l2.8,2.8l0,4.2l-2.1,2.8l0.7,4.9l-4.2,2.1l-2.1-2.1l-4.9,0.7l-2.8,2.1l-4.2-0.7l-2.1-2.8l-4.9,0l-2.8,2.1l-4.2-0.7l-2.1-2.8l-4.2,0l-2.8-2.8l-4.9,0.7l-2.1-2.8l-4.2,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l0.7-4.2l-2.8-2.1l0-4.9l2.8-2.8l-0.7-4.2l2.8-2.1l0.7-4.9l4.2-0.7l2.1,2.8l4.9-0.7l2.8,2.1l4.2,0l2.1-2.1l4.9,0.7l2.8,2.8l4.2-0.7L280,254.8z", name: "Minas Gerais", cx: 285, cy: 280 },
  MS: { path: "M210.8,262.8l2.8,2.1l4.2,0l2.8,2.8l4.2-0.7l2.1,2.8l-0.7,4.9l-2.8,2.1l0.7,4.2l-2.8,2.8l0,4.2l-2.1,2.8l0.7,4.9l-2.8,2.1l-0.7,4.2l-4.2,2.1l-4.2-0.7l-2.8,2.1l-4.2,0l-2.8-2.8l-4.2,0.7l-2.1-2.8l0.7-4.2l-2.8-2.1l0-4.9l2.1-2.8l-0.7-4.2l2.8-2.8l0-4.2l2.8-2.1l-0.7-4.9l2.8-2.1l0.7-4.2l4.2,0l2.8,2.1l4.2-0.7L210.8,262.8z", name: "Mato Grosso do Sul", cx: 205, cy: 295 },
  MT: { path: "M164.4,194.8l2.8,2.1l4.2,0l2.8,2.8l4.9-0.7l2.1,2.8l4.2,0l2.8,2.1l4.2-0.7l2.8,2.8l4.2,0l2.1,2.8l4.9-0.7l2.1,2.8l-0.7,4.2l2.8,2.8l-0.7,4.2l2.8,2.1l-0.7,4.9l-2.8,2.1l0.7,4.2l-2.8,2.8l0,4.2l-2.8,2.1l-0.7,4.9l-4.2,0.7l-2.8-2.1l-4.2,0.7l-2.1-2.8l-4.9,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.1-2.8l-4.9,0l-2.1,2.1l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.1-2.8l0.7-4.2l-2.8-2.8l0.7-4.2l-2.8-2.1l0.7-4.9l2.8-2.1l-0.7-4.2l2.8-2.8l0-4.2l2.8-2.1l0.7-4.9l4.2-0.7l2.8,2.1l4.2-0.7l2.1,2.8L164.4,194.8z", name: "Mato Grosso", cx: 185, cy: 232 },
  PA: { path: "M160.4,112.8l2.8,2.1l4.9,0l2.1,2.8l4.2,0l2.8,2.1l4.9-0.7l2.1,2.8l4.2,0l2.8,2.8l4.2,0l2.8,2.1l4.2-0.7l2.8,2.8l-0.7,4.2l2.8,2.8l-0.7,4.2l2.8,2.1l0.7,4.9l-2.8,2.1l0.7,4.2l-2.8,2.8l0.7,4.2l-2.8,2.1l0,4.9l-2.8,2.8l-0.7,4.2l-4.2,0.7l-2.1-2.8l-4.9,0.7l-2.8,2.1l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.1-2.8l-4.9,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.1-2.8l0.7-4.2l-2.8-2.8l0.7-4.2l-2.8-2.1l-0.7-4.9l2.8-2.1l-0.7-4.2l2.8-2.8l-0.7-4.2l2.8-2.1l0-4.9l2.8-2.8l0.7-4.2l-2.1-2.8l0.7-4.9l2.8-2.1l4.9,0.7l2.1,2.8l4.2-0.7L160.4,112.8z", name: "Pará", cx: 195, cy: 158 },
  PB: { path: "M356.4,180.4l4.2,2.1l4.9-0.7l2.8,2.8l-0.7,4.2l-4.2,2.1l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.8-2.1l2.1-2.8L356.4,180.4z", name: "Paraíba", cx: 362, cy: 186 },
  PE: { path: "M344.4,194.8l4.2,0.7l2.8,2.8l4.9-0.7l2.1,2.8l4.2,0l2.8-2.1l-0.7,4.2l-4.2,2.1l-4.2-0.7l-2.8,2.8l-4.9-0.7l-2.8,2.1l-4.2-0.7l-2.8-2.8l-4.2,0l-2.1,2.1l2.1-4.2l-0.7-4.2l2.8-2.1l4.2,0.7L344.4,194.8z", name: "Pernambuco", cx: 355, cy: 202 },
  PI: { path: "M298.8,158.4l2.8,2.1l4.9,0l2.1,2.8l4.2-0.7l2.8,2.8l-0.7,4.2l2.8,2.1l-0.7,4.9l-2.8,2.1l0.7,4.2l-2.8,2.8l-4.2-0.7l-2.8,2.1l-4.2,0l-2.8-2.8l-4.2,0.7l-2.1-2.8l0.7-4.2l-2.8-2.8l0.7-4.2l-2.8-2.1l0.7-4.9l2.8-2.1l4.2,0.7L298.8,158.4z", name: "Piauí", cx: 300, cy: 178 },
  PR: { path: "M220.4,306l2.8,2.1l4.9,0l2.1,2.8l4.2-0.7l2.8,2.8l4.2,0l2.8,2.1l-0.7,4.2l-2.8,2.8l-4.2-0.7l-2.8,2.1l-4.2,0l-2.8-2.8l-4.9,0.7l-2.1-2.8l-4.2,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l0.7-4.2l2.8-2.1l-0.7-4.2l4.2-0.7l2.8,2.1l4.2-0.7L220.4,306z", name: "Paraná", cx: 228, cy: 316 },
  RJ: { path: "M306,294.8l2.8,2.1l4.9,0l2.1,2.8l4.2-0.7l2.8,2.8l-0.7,4.2l-2.8,2.1l-4.2-0.7l-2.8,2.8l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.1-2.8l2.1-2.8l-0.7-4.2L306,294.8z", name: "Rio de Janeiro", cx: 314, cy: 302 },
  RN: { path: "M356.4,164.4l4.2,2.1l4.9-0.7l2.8,2.8l-0.7,4.2l-4.2,2.1l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.8-2.1l2.1-2.8L356.4,164.4z", name: "Rio Grande do Norte", cx: 362, cy: 170 },
  RO: { path: "M124.4,198.8l2.8,2.1l4.9,0l2.1,2.8l4.2-0.7l2.8,2.8l-0.7,4.2l-2.8,2.8l0.7,4.2l-2.8,2.1l-0.7,4.9l-4.2,0.7l-2.8-2.1l-4.2,0.7l-2.1-2.8l-4.9,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l0.7-4.2l-2.8-2.1l0.7-4.9l2.8-2.1l-0.7-4.2l4.2-0.7l2.8,2.1l4.2-0.7l2.1,2.8L124.4,198.8z", name: "Rondônia", cx: 120, cy: 218 },
  RR: { path: "M94.8,68.4l2.8,2.1l4.9,0l2.1,2.8l4.2-0.7l2.8,2.8l-0.7,4.2l2.8,2.8l-0.7,4.2l-2.8,2.1l0.7,4.9l-2.8,2.1l-0.7,4.2l-4.2,0.7l-2.8-2.1l-4.2,0.7l-2.1-2.8l-4.9,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l0.7-4.2l-2.8-2.8l0.7-4.2l2.8-2.1l-0.7-4.9l2.8-2.1l0.7-4.2l4.2-0.7l2.8,2.1l4.2-0.7L94.8,68.4z", name: "Roraima", cx: 94, cy: 90 },
  RS: { path: "M210.4,340l2.8,2.1l4.9,0l2.1,2.8l4.2-0.7l2.8,2.8l-0.7,4.2l-2.8,2.8l0.7,4.2l-2.8,2.1l-0.7,4.9l-4.2,0.7l-2.8-2.1l-4.2,0.7l-2.1-2.8l-4.9,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.1-2.8l0.7-4.2l-2.8-2.8l0.7-4.2l2.8-2.1l-0.7-4.9l4.2-0.7l2.8,2.1l4.2-0.7l2.1,2.8l4.9-0.7L210.4,340z", name: "Rio Grande do Sul", cx: 205, cy: 360 },
  SC: { path: "M232.4,330l2.8,2.1l4.2,0l2.8,2.8l-0.7,4.2l-2.8,2.1l-4.2-0.7l-2.8,2.8l-4.2-0.7l-2.8-2.8l-4.2,0.7l-2.1-2.8l2.1-2.8l-0.7-4.2l4.2-0.7l2.8,2.1L232.4,330z", name: "Santa Catarina", cx: 232, cy: 338 },
  SE: { path: "M364.4,218l2.8,2.1l-0.7,4.2l-2.8,2.1l-4.2-0.7l-2.8-2.8l2.8-2.1L364.4,218z", name: "Sergipe", cx: 364, cy: 224 },
  SP: { path: "M254.8,290l2.8,2.1l4.9,0l2.1,2.8l4.2-0.7l2.8,2.8l4.2,0l2.8,2.1l-0.7,4.2l-2.8,2.8l-4.2-0.7l-2.8,2.1l-4.2,0l-2.8-2.8l-4.9,0.7l-2.1-2.8l-4.2,0l-2.8,2.1l-4.2-0.7l-2.8-2.8l0.7-4.2l2.8-2.1l-0.7-4.2l4.2-0.7l2.8,2.1l4.2-0.7L254.8,290z", name: "São Paulo", cx: 260, cy: 302 },
  TO: { path: "M250.8,174.8l2.8,2.1l4.2,0l2.8,2.8l-0.7,4.2l2.8,2.8l-0.7,4.2l2.8,2.1l0.7,4.9l-2.8,2.1l0.7,4.2l-2.8,2.8l-4.2-0.7l-2.8,2.1l-4.2,0l-2.8-2.8l-4.2,0.7l-2.1-2.8l0.7-4.2l-2.8-2.8l0.7-4.2l-2.8-2.1l0.7-4.9l2.8-2.1l-0.7-4.2l4.2-0.7l2.8,2.1l4.2-0.7L250.8,174.8z", name: "Tocantins", cx: 252, cy: 198 },
};

const getColorBySuccessRate = (rate: number): string => {
  if (rate >= 80) return '#22c55e';
  if (rate >= 60) return '#84cc16';
  if (rate >= 40) return '#eab308';
  if (rate >= 20) return '#f97316';
  if (rate > 0) return '#ef4444';
  return '#6b7280';
};

const getStatusBySuccessRate = (rate: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  if (rate >= 80) return { label: 'Excelente', variant: 'default' };
  if (rate >= 60) return { label: 'Bom', variant: 'default' };
  if (rate >= 40) return { label: 'Regular', variant: 'secondary' };
  if (rate >= 20) return { label: 'Baixo', variant: 'destructive' };
  if (rate > 0) return { label: 'Crítico', variant: 'destructive' };
  return { label: 'Sem dados', variant: 'outline' };
};

type SortOption = 'vitorias' | 'taxaSucesso' | 'valorVencido' | 'total';

export function BrazilHeatmap({ ufData, municipioData = [], onUFClick, selectedUF }: BrazilHeatmapProps) {
  const [hoveredUF, setHoveredUF] = useState<string | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('vitorias');

  const ufDataMap = useMemo(() => {
    const map = new Map<string, UFData>();
    ufData.forEach(uf => map.set(uf.uf, uf));
    return map;
  }, [ufData]);

  const filteredAndSortedMunicipios = useMemo(() => {
    if (!selectedUF) return [];
    
    let filtered = municipioData.filter(m => m.uf === selectedUF);
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.municipio.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'vitorias':
          return b.vitorias - a.vitorias || b.taxaSucesso - a.taxaSucesso;
        case 'taxaSucesso':
          return b.taxaSucesso - a.taxaSucesso || b.vitorias - a.vitorias;
        case 'valorVencido':
          return b.valorVencido - a.valorVencido || b.taxaSucesso - a.taxaSucesso;
        case 'total':
          return b.total - a.total || b.vitorias - a.vitorias;
        default:
          return 0;
      }
    });
  }, [selectedUF, municipioData, searchTerm, sortBy]);

  const totalMunicipiosCount = useMemo(() => {
    if (!selectedUF) return 0;
    return municipioData.filter(m => m.uf === selectedUF).length;
  }, [selectedUF, municipioData]);

  const hoveredData = hoveredUF ? ufDataMap.get(hoveredUF) : null;
  const selectedData = selectedUF ? ufDataMap.get(selectedUF) : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleUFClick = (uf: string) => {
    if (selectedUF === uf) {
      setShowDrillDown(false);
      onUFClick?.(uf);
    } else {
      setShowDrillDown(true);
      onUFClick?.(uf);
    }
  };

  const handleBackToMap = () => {
    setShowDrillDown(false);
    onUFClick?.('');
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {showDrillDown && selectedUF 
              ? `Municípios de ${BRAZIL_STATES[selectedUF]?.name || selectedUF}`
              : 'Mapa de Performance por Estado'
            }
          </CardTitle>
          {showDrillDown && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToMap}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar ao Mapa
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Drill-down view for municipalities */}
        {showDrillDown && selectedUF ? (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            {/* State Summary Header */}
            {selectedData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <BarChart3 className="w-3 h-3" />
                    Total
                  </div>
                  <p className="text-xl font-bold">{selectedData.total}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Trophy className="w-3 h-3" />
                    Vitórias
                  </div>
                  <p className="text-xl font-bold text-success">{selectedData.vitorias}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Target className="w-3 h-3" />
                    Taxa
                  </div>
                  <p className="text-xl font-bold">{selectedData.taxaSucesso}%</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <DollarSign className="w-3 h-3" />
                    Valor
                  </div>
                  <p className="text-xl font-bold text-success">{formatCurrency(selectedData.valorVencido)}</p>
                </div>
              </div>
            )}

            {/* Municipalities List */}
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Municípios 
                  <Badge variant="secondary" className="ml-1">
                    {searchTerm ? `${filteredAndSortedMunicipios.length} de ${totalMunicipiosCount}` : totalMunicipiosCount}
                  </Badge>
                </h4>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar município..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 w-full sm:w-[200px]"
                    />
                  </div>
                  
                  {/* Sort Select */}
                  <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vitorias">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-success" />
                          Mais vitórias
                        </div>
                      </SelectItem>
                      <SelectItem value="taxaSucesso">
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-primary" />
                          Maior taxa de sucesso
                        </div>
                      </SelectItem>
                      <SelectItem value="valorVencido">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-3.5 h-3.5 text-success" />
                          Maior valor vencido
                        </div>
                      </SelectItem>
                      <SelectItem value="total">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                          Mais licitações
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {filteredAndSortedMunicipios.length > 0 ? (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-2">
                    {filteredAndSortedMunicipios.map((m, index) => (
                      <div
                        key={`${m.municipio}-${m.uf}`}
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                              index === 1 ? 'bg-gray-400/20 text-gray-600' :
                              index === 2 ? 'bg-orange-500/20 text-orange-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{m.municipio}</p>
                              <p className="text-xs text-muted-foreground">
                                {m.total} licitações captadas
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={getStatusBySuccessRate(m.taxaSucesso).variant}
                            className="shrink-0"
                          >
                            {m.taxaSucesso}% sucesso
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Performance</span>
                            <span>
                              <span className="text-success font-medium">{m.vitorias} vitórias</span>
                              {m.perdidas > 0 && (
                                <span className="text-destructive ml-2">{m.perdidas} perdidas</span>
                              )}
                            </span>
                          </div>
                          
                          <Progress 
                            value={m.taxaSucesso} 
                            className="h-1.5"
                          />
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Valor captado: {formatCurrency(m.valorTotal)}</span>
                            <span className="text-success font-medium">
                              Vencido: {formatCurrency(m.valorVencido)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  {searchTerm ? (
                    <>
                      <p>Nenhum município encontrado</p>
                      <p className="text-xs mt-1">Tente buscar com outro termo</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => setSearchTerm('')}
                        className="mt-2"
                      >
                        Limpar busca
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>Nenhum município com licitações</p>
                      <p className="text-xs mt-1">Clique em outro estado para ver detalhes</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Alert for low performance municipalities */}
            {filteredAndSortedMunicipios.filter(m => m.taxaSucesso > 0 && m.taxaSucesso < 40).length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Municípios com Baixa Performance</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {filteredAndSortedMunicipios
                    .filter(m => m.taxaSucesso > 0 && m.taxaSucesso < 40)
                    .slice(0, 5)
                    .map(m => (
                      <Badge key={m.municipio} variant="outline" className="text-xs">
                        {m.municipio}: {m.taxaSucesso}%
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Map View */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Map */}
            <div className="flex-1 relative">
              <svg
                viewBox="0 0 420 420"
                className="w-full h-auto max-h-[500px]"
              >
                <rect width="420" height="420" fill="transparent" />
                
                {Object.entries(BRAZIL_STATES).map(([uf, { path, name }]) => {
                  const data = ufDataMap.get(uf);
                  const successRate = data?.taxaSucesso || 0;
                  const fillColor = getColorBySuccessRate(successRate);
                  const isHovered = hoveredUF === uf;
                  const isSelected = selectedUF === uf;
                  
                  return (
                    <g key={uf}>
                      <path
                        d={path}
                        fill={fillColor}
                        stroke={isSelected ? 'hsl(var(--primary))' : isHovered ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
                        strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                        className="transition-all duration-200 cursor-pointer"
                        style={{
                          filter: isHovered || isSelected ? 'brightness(1.1)' : 'none',
                          opacity: data ? 1 : 0.4,
                        }}
                        onMouseEnter={() => setHoveredUF(uf)}
                        onMouseLeave={() => setHoveredUF(null)}
                        onClick={() => handleUFClick(uf)}
                      >
                        <title>{name}: {data ? `${successRate}% de sucesso - Clique para ver municípios` : 'Sem dados'}</title>
                      </path>
                    </g>
                  );
                })}

                {Object.entries(BRAZIL_STATES).map(([uf, { cx, cy }]) => {
                  const data = ufDataMap.get(uf);
                  if (!data) return null;
                  
                  return (
                    <text
                      key={`label-${uf}`}
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none select-none"
                      fill="white"
                      fontSize="9"
                      fontWeight="bold"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {uf}
                    </text>
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredData && !showDrillDown && (
                <div className="absolute top-4 left-4 bg-card border rounded-lg shadow-lg p-3 min-w-[220px] z-10 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{BRAZIL_STATES[hoveredData.uf]?.name || hoveredData.uf}</span>
                    <Badge variant={getStatusBySuccessRate(hoveredData.taxaSucesso).variant}>
                      {hoveredData.taxaSucesso}%
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Licitações:</span>
                      <span>{hoveredData.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vitórias:</span>
                      <span className="text-success">{hoveredData.vitorias}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor Vencido:</span>
                      <span>{formatCurrency(hoveredData.valorVencido)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                    Clique para ver municípios →
                  </p>
                </div>
              )}
            </div>

            {/* Legend and Stats */}
            <div className="lg:w-64 space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Taxa de Sucesso</h4>
                <div className="space-y-1">
                  {[
                    { min: 80, label: '80%+', color: '#22c55e', status: 'Excelente' },
                    { min: 60, label: '60-79%', color: '#84cc16', status: 'Bom' },
                    { min: 40, label: '40-59%', color: '#eab308', status: 'Regular' },
                    { min: 20, label: '20-39%', color: '#f97316', status: 'Baixo' },
                    { min: 1, label: '1-19%', color: '#ef4444', status: 'Crítico' },
                    { min: 0, label: '0%', color: '#6b7280', status: 'Sem dados' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-muted-foreground">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Top Estados
                </h4>
                {ufData
                  .filter(u => u.vitorias > 0)
                  .sort((a, b) => b.taxaSucesso - a.taxaSucesso)
                  .slice(0, 3)
                  .map((uf, i) => (
                    <div 
                      key={uf.uf}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleUFClick(uf.uf)}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                        i === 1 ? 'bg-gray-400/20 text-gray-600' :
                        'bg-orange-500/20 text-orange-600'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 font-medium">{uf.uf}</span>
                      <Badge variant="outline" className="text-xs">
                        {uf.taxaSucesso}%
                      </Badge>
                    </div>
                  ))}
              </div>

              {ufData.filter(u => u.taxaSucesso > 0 && u.taxaSucesso < 40).length > 0 && (
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Atenção</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ufData.filter(u => u.taxaSucesso > 0 && u.taxaSucesso < 40).length} estados com taxa abaixo de 40%
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                Clique em um estado para ver os municípios
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
