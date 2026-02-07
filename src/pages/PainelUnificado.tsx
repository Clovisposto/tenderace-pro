import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { CadastroEmpresaTab } from '@/components/painel/CadastroEmpresaTab';
import { CaptacaoTab } from '@/components/painel/CaptacaoTab';
import { AnaliseEditalTab } from '@/components/painel/AnaliseEditalTab';
import { PropostaTab } from '@/components/painel/PropostaTab';
import { ParticipacaoTab } from '@/components/painel/ParticipacaoTab';
import { 
  Building2, Radar, FileSearch, FileSignature, Trophy 
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const PainelUnificado = () => {
  const [activeTab, setActiveTab] = useState('cadastro');
  const isMobile = useIsMobile();

  const tabs = [
    { value: 'cadastro', label: 'Cadastro', shortLabel: 'Cadastro', icon: Building2 },
    { value: 'captacao', label: 'Captação', shortLabel: 'Captar', icon: Radar },
    { value: 'analise', label: 'Análise', shortLabel: 'Análise', icon: FileSearch },
    { value: 'proposta', label: 'Proposta', shortLabel: 'Proposta', icon: FileSignature },
    { value: 'participacao', label: 'Participação', shortLabel: 'Particip.', icon: Trophy },
  ];

  return (
    <MainLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`w-full ${isMobile ? 'grid grid-cols-5 h-auto' : 'grid grid-cols-5'} bg-muted/50 p-1 rounded-xl`}>
          {tabs.map((tab, i) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value}
              className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs md:text-sm py-2.5"
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.shortLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cadastro"><CadastroEmpresaTab /></TabsContent>
        <TabsContent value="captacao"><CaptacaoTab /></TabsContent>
        <TabsContent value="analise"><AnaliseEditalTab /></TabsContent>
        <TabsContent value="proposta"><PropostaTab /></TabsContent>
        <TabsContent value="participacao"><ParticipacaoTab /></TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default PainelUnificado;
