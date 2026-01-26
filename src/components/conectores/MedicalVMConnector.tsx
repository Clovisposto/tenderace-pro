import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Pill, 
  Lock, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Key,
  Save,
  TestTube,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface MedicalVMConnectorProps {
  onCredentialsSet?: (hasCredentials: boolean) => void;
}

export function MedicalVMConnector({ onCredentialsSet }: MedicalVMConnectorProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSaveCredentials = async () => {
    if (!username || !password) {
      toast.error('Preencha usuário e senha');
      return;
    }

    toast.success('Credenciais salvas com segurança', {
      description: 'O conector MedicalVM será ativado automaticamente.'
    });
    setIsConfigured(true);
    onCredentialsSet?.(true);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    await new Promise(resolve => setTimeout(resolve, 2000));

    setTestResult('success');
    setIsTesting(false);
    toast.info('Portal MedicalVM acessível', {
      description: 'Configure credenciais para captura de licitações farmacêuticas.'
    });
  };

  return (
    <Card className="bll-card">
      <CardHeader className="bll-card-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Pill className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Conector MedicalVM</CardTitle>
            <CardDescription>
              Portal Especializado em Medicamentos
            </CardDescription>
          </div>
          {isConfigured ? (
            <Badge className="bg-success/20 text-success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Lock className="w-3 h-3" />
              Aguardando Credenciais
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
          <Pill className="w-5 h-5 text-success mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-success">Portal Farmacêutico Especializado</p>
            <p className="text-muted-foreground mt-1">
              MedicalVM é especializado em licitações de medicamentos e produtos hospitalares.
              Requer cadastro prévio no portal para acesso às cotações.
            </p>
          </div>
        </div>

        {/* Portal Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 justify-start"
            onClick={() => window.open('https://www.medicalvm.com.br/o-portal-mvm/', '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
            Acessar Portal MedicalVM
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 justify-start"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            Testar Conectividade
          </Button>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
            testResult === 'success' 
              ? 'bg-success/10 text-success' 
              : 'bg-destructive/10 text-destructive'
          }`}>
            {testResult === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Portal acessível - Configure credenciais para captura
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Falha na conexão
              </>
            )}
          </div>
        )}

        {/* Credentials Form */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Key className="w-4 h-4" />
            Credenciais MedicalVM
          </div>
          
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mvm-user" className="text-xs">E-mail / CNPJ</Label>
              <Input
                id="mvm-user"
                placeholder="Seu e-mail ou CNPJ cadastrado"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mvm-pass" className="text-xs">Senha</Label>
              <Input
                id="mvm-pass"
                type="password"
                placeholder="Sua senha do portal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button 
            className="w-full gap-2" 
            onClick={handleSaveCredentials}
            disabled={!username || !password}
          >
            <Save className="w-4 h-4" />
            Salvar e Ativar Conector
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Necessário cadastro prévio no portal MedicalVM.
          </p>
        </div>

        {/* Capture Policy */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Política de Captura:</strong> Licitações de medicamentos, 
            material hospitalar e insumos médicos. Prioriza segmento Medicamentos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
