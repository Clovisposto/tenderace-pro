import { ParticipacoesDashboardTab } from '@/components/dashboard/ParticipacoesDashboardTab';

export function ParticipacaoTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Participação e Acompanhamento</h2>
        <p className="text-sm text-muted-foreground">Monitore disputas em tempo real, acompanhe resultados e gerencie contratos</p>
      </div>
      <ParticipacoesDashboardTab />
    </div>
  );
}
