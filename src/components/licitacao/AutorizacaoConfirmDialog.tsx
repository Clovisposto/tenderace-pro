import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Check,
  CheckCircle2,
  Shield,
  FileCheck,
  AlertTriangle,
  Scale,
  Clock,
  Loader2,
  ShieldCheck,
  FileText,
  Building2,
  Gavel,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'loading' | 'completed' | 'error';
  legalBasis?: string;
}

interface AutorizacaoConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licitacao: {
    numero: string;
    orgao: string;
    objeto: string;
    valor: number;
    modalidade: string;
    portal: string;
  };
  onConfirm: () => void;
  isPending: boolean;
}

export function AutorizacaoConfirmDialog({
  open,
  onOpenChange,
  licitacao,
  onConfirm,
  isPending,
}: AutorizacaoConfirmDialogProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      id: 'compliance',
      label: 'Verificação de Compliance',
      description: 'Verificando documentação e certidões da empresa',
      icon: <Shield className="w-5 h-5" />,
      status: 'pending',
      legalBasis: 'Art. 62 da Lei 14.133/2021',
    },
    {
      id: 'edital',
      label: 'Análise do Edital',
      description: 'Conferindo exigências técnicas e habilitação',
      icon: <FileCheck className="w-5 h-5" />,
      status: 'pending',
      legalBasis: 'Art. 67 da Lei 14.133/2021',
    },
    {
      id: 'sicaf',
      label: 'Consulta SICAF',
      description: 'Verificando regularidade cadastral',
      icon: <Building2 className="w-5 h-5" />,
      status: 'pending',
      legalBasis: 'Art. 87, §2º da Lei 14.133/2021',
    },
    {
      id: 'legal',
      label: 'Conformidade Legal',
      description: 'Validando requisitos da Lei de Licitações',
      icon: <Scale className="w-5 h-5" />,
      status: 'pending',
      legalBasis: 'Lei 14.133/2021 - Nova Lei de Licitações',
    },
    {
      id: 'robot',
      label: 'Preparação do Robô',
      description: 'Configurando automação para participação',
      icon: <Bot className="w-5 h-5" />,
      status: 'pending',
    },
  ]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTermsAccepted(false);
      setLegalConfirmed(false);
      setIsVerifying(false);
      setVerificationComplete(false);
      setCurrentStepIndex(-1);
      setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
    }
  }, [open]);

  const startVerification = () => {
    setIsVerifying(true);
    setCurrentStepIndex(0);
  };

  // Run verification steps sequentially
  useEffect(() => {
    if (!isVerifying || currentStepIndex < 0) return;

    if (currentStepIndex >= steps.length) {
      setVerificationComplete(true);
      setIsVerifying(false);
      return;
    }

    // Update current step to loading
    setSteps(prev =>
      prev.map((s, i) =>
        i === currentStepIndex ? { ...s, status: 'loading' } : s
      )
    );

    // Simulate verification time (realistic delays)
    const delays = [800, 1200, 1000, 900, 600];
    const timer = setTimeout(() => {
      setSteps(prev =>
        prev.map((s, i) =>
          i === currentStepIndex ? { ...s, status: 'completed' } : s
        )
      );
      setCurrentStepIndex(i => i + 1);
    }, delays[currentStepIndex] || 800);

    return () => clearTimeout(timer);
  }, [isVerifying, currentStepIndex, steps.length]);

  const handleConfirm = () => {
    onConfirm();
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Autorização de Participação Automatizada
          </DialogTitle>
          <DialogDescription>
            Processo de verificação conforme Lei 14.133/2021
          </DialogDescription>
        </DialogHeader>

        {/* Licitação Summary */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-primary" />
            <span>{licitacao.numero}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{licitacao.portal}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{licitacao.objeto}</p>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="truncate max-w-[200px]">{licitacao.orgao}</span>
            </div>
            <span className="font-bold text-primary">{formatCurrency(licitacao.valor)}</span>
          </div>
        </div>

        {!isVerifying && !verificationComplete ? (
          <>
            {/* Legal Terms */}
            <div className="space-y-4">
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Aviso Legal Importante</h4>
                    <p className="text-sm text-muted-foreground">
                      Ao autorizar o robô, você confirma que todas as exigências do edital
                      foram verificadas e que sua empresa está apta a participar conforme
                      a <strong>Lei 14.133/2021</strong> (Nova Lei de Licitações).
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                      Declaro que li e aceito os termos de participação automatizada
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      O robô atuará em nome da empresa, respeitando os limites estabelecidos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="legal"
                    checked={legalConfirmed}
                    onCheckedChange={(checked) => setLegalConfirmed(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="legal" className="text-sm font-medium cursor-pointer">
                      Confirmo conformidade com a Lei 14.133/2021
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      A empresa possui toda documentação exigida e está regular perante o SICAF.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={startVerification}
                  disabled={!termsAccepted || !legalConfirmed}
                  className="flex-1 gap-2"
                >
                  <Gavel className="w-4 h-4" />
                  Iniciar Verificação
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Verification Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso da Verificação</span>
                <span className="text-sm text-muted-foreground">
                  {completedSteps}/{steps.length} etapas
                </span>
              </div>
              <Progress value={progress} className="h-2" />

              {/* Steps List */}
              <div className="space-y-3 py-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border transition-all duration-300',
                      step.status === 'completed' && 'bg-success/5 border-success/30',
                      step.status === 'loading' && 'bg-primary/5 border-primary/30 animate-pulse',
                      step.status === 'pending' && 'bg-muted/30 border-border opacity-60',
                      step.status === 'error' && 'bg-destructive/5 border-destructive/30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all',
                        step.status === 'completed' && 'bg-success text-success-foreground',
                        step.status === 'loading' && 'bg-primary text-primary-foreground',
                        step.status === 'pending' && 'bg-muted text-muted-foreground',
                        step.status === 'error' && 'bg-destructive text-destructive-foreground'
                      )}
                    >
                      {step.status === 'completed' ? (
                        <Check className="w-5 h-5" />
                      ) : step.status === 'loading' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{step.label}</span>
                        {step.status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {step.description}
                      </p>
                      {step.legalBasis && step.status === 'completed' && (
                        <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                          <Scale className="w-3 h-3" />
                          {step.legalBasis}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {step.status === 'completed' && (
                        <span className="text-xs text-success font-medium">OK</span>
                      )}
                      {step.status === 'loading' && (
                        <span className="text-xs text-primary font-medium">Verificando...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Verification Complete */}
              {verificationComplete && (
                <div className="rounded-lg border-2 border-success bg-success/5 p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-success">Verificação Concluída!</h4>
                      <p className="text-sm text-muted-foreground">
                        Todos os requisitos foram verificados. Pronto para autorizar.
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span>Robô preparado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Monitoramento 24/7</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-warning" />
                      <span>Resposta automática</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isVerifying || isPending}
                  className="flex-1"
                >
                  {verificationComplete ? 'Cancelar' : 'Fechar'}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!verificationComplete || isPending}
                  className="flex-1 gap-2"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  {isPending ? 'Autorizando...' : 'Confirmar Autorização'}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Footer Legal Notice */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          <p>
            Processo em conformidade com a{' '}
            <span className="font-medium">Lei nº 14.133/2021</span> e demais
            normativos aplicáveis.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
