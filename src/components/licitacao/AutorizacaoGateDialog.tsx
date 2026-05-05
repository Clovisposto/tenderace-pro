import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Lock } from 'lucide-react';

const REQUIRED_PHRASE = 'AUTORIZAR_PARTICIPAÇÃO';

interface AutorizacaoGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorize: () => void;
  isPending?: boolean;
  contextLabel?: string;
  actionDescription?: string;
}

/**
 * GATE_LEGAL: Bloqueio obrigatório antes de qualquer envio de proposta/lance.
 * O usuário PRECISA digitar AUTORIZAR_PARTICIPAÇÃO para liberar a ação.
 */
export function AutorizacaoGateDialog({
  open,
  onOpenChange,
  onAuthorize,
  isPending = false,
  contextLabel,
  actionDescription = 'Esta ação enviará dados oficiais ao portal de licitações em nome da empresa.',
}: AutorizacaoGateDialogProps) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const isMatch = typed.trim().toUpperCase() === REQUIRED_PHRASE;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning" />
            Autorização Explícita Necessária
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{actionDescription}</p>
              {contextLabel && (
                <p className="text-xs rounded-md border bg-muted/40 p-2 font-mono">
                  {contextLabel}
                </p>
              )}
              <p className="text-sm">
                Para prosseguir, digite exatamente:{' '}
                <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {REQUIRED_PHRASE}
                </code>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="gate-phrase" className="text-xs uppercase tracking-wide text-muted-foreground">
            <Lock className="inline w-3 h-3 mr-1" />
            Confirmação
          </Label>
          <Input
            id="gate-phrase"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={REQUIRED_PHRASE}
            autoComplete="off"
            autoFocus
            className={isMatch ? 'border-success focus-visible:ring-success' : ''}
          />
          {typed && !isMatch && (
            <p className="text-xs text-destructive">A frase precisa ser idêntica para liberar.</p>
          )}
          {isMatch && (
            <p className="text-xs text-success">✓ Autorização pronta para confirmar</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!isMatch || isPending}
            onClick={(e) => {
              e.preventDefault();
              if (isMatch) onAuthorize();
            }}
          >
            {isPending ? 'Enviando...' : 'Autorizar e Enviar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
