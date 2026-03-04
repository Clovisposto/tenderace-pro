import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  Loader2,
  CheckCircle2,
  Trash2,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Lock,
  FileKey,
  Globe,
  PlayCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CertificadoA1UploadProps {
  empresaId: string;
  empresaNome: string;
  certificadoTipo?: string;
}

type TestStatus = 'idle' | 'starting' | 'polling' | 'success' | 'error';

export function CertificadoA1Upload({ empresaId, empresaNome, certificadoTipo }: CertificadoA1UploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [senha, setSenha] = useState('');

  // Test login state
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testConfigId, setTestConfigId] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testElapsed, setTestElapsed] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isA1 = certificadoTipo?.includes('A1');

  // Check if certificate exists
  useEffect(() => {
    if (!user || !empresaId) return;
    const checkFile = async () => {
      const path = `${user.id}/${empresaId}/`;
      const { data } = await supabase.storage
        .from('certificados-digitais')
        .list(path);
      const cert = data?.find(f => f.name.endsWith('.pfx') || f.name.endsWith('.p12'));
      if (cert) {
        setHasFile(true);
        setFileName(cert.name);
      }
    };
    checkFile();
  }, [user, empresaId]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pfx', 'p12'].includes(ext || '')) {
      toast({ title: 'Formato inválido', description: 'Envie um arquivo .pfx ou .p12', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${empresaId}/certificado.${ext}`;

      if (hasFile) {
        const oldPath = `${user.id}/${empresaId}/${fileName}`;
        await supabase.storage.from('certificados-digitais').remove([oldPath]);
      }

      const { error } = await supabase.storage
        .from('certificados-digitais')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      setHasFile(true);
      setFileName(`certificado.${ext}`);
      toast({ title: '✅ Certificado A1 enviado', description: 'Arquivo armazenado com segurança.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err?.message || 'Falha ao enviar.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!user || !hasFile) return;
    if (!confirm('Remover o certificado digital A1?')) return;
    
    setUploading(true);
    try {
      const path = `${user.id}/${empresaId}/${fileName}`;
      await supabase.storage.from('certificados-digitais').remove([path]);
      setHasFile(false);
      setFileName('');
      toast({ title: 'Certificado removido' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // ─── Test Login Gov.br ───
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const pollTestStatus = useCallback(async (configId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('robo-controle', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
      });
      
      // Use fetch directly since invoke doesn't support GET params well
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/robo-controle?action=testar-login-status&config_id=${configId}`;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (!res.ok) return;
      const result = await res.json();
      const config = result.config;
      
      if (!config) return;
      
      // Check terminal states
      if (config.status === 'finalizado' || config.status === 'login_ok') {
        setTestStatus('success');
        setTestError(null);
        stopPolling();
        toast({ title: '✅ Login Gov.br bem-sucedido!', description: 'O certificado digital está funcionando corretamente.' });
      } else if (config.status === 'erro' || !config.ativo) {
        setTestStatus('error');
        setTestError(config.erro_mensagem || 'Falha no teste de login');
        stopPolling();
        toast({ title: '❌ Falha no login Gov.br', description: config.erro_mensagem || 'Verifique o certificado e a senha.', variant: 'destructive' });
      }
      // Otherwise keep polling (testando_login, conectando, etc.)
    } catch (err) {
      console.error('Erro ao verificar status do teste:', err);
    }
  }, [stopPolling, toast]);

  const handleTestLogin = async () => {
    if (!user || !hasFile) {
      toast({ title: 'Certificado necessário', description: 'Envie o certificado A1 primeiro.', variant: 'destructive' });
      return;
    }

    setTestStatus('starting');
    setTestError(null);
    setTestElapsed(0);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/robo-controle?action=testar-login`;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ empresa_id: empresaId, user_id: user.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Falha ao iniciar teste');
      }

      const configId = result.config_id;
      setTestConfigId(configId);
      setTestStatus('polling');

      toast({ title: '🔄 Teste iniciado', description: 'O robô tentará fazer login no Gov.br. Aguarde...' });

      // Start elapsed timer
      elapsedIntervalRef.current = setInterval(() => {
        setTestElapsed(prev => prev + 1);
      }, 1000);

      // Poll every 5s for up to 3 minutes
      let pollCount = 0;
      const maxPolls = 36; // 3 minutes
      pollIntervalRef.current = setInterval(() => {
        pollCount++;
        if (pollCount >= maxPolls) {
          setTestStatus('error');
          setTestError('Timeout: O teste excedeu 3 minutos sem resposta.');
          stopPolling();
          return;
        }
        pollTestStatus(configId);
      }, 5000);

    } catch (err: any) {
      setTestStatus('error');
      setTestError(err?.message || 'Erro desconhecido');
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' });
    }
  };

  if (!isA1) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-warning">Certificado A3 — Automação Limitada</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                O certificado A3 (token/cartão físico) não pode ser armazenado digitalmente para automação. 
                Para que o robô entre automaticamente na sala de disputa, é necessário um <strong>certificado A1</strong> (arquivo .pfx/.p12).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileKey className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-primary">Upload do Certificado A1</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Envie o arquivo <strong>.pfx</strong> ou <strong>.p12</strong> do certificado digital A1. 
                O arquivo é armazenado com <strong>criptografia</strong> e usado exclusivamente pelo robô 
                para autenticação nos portais de licitação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pfx,.p12"
        onChange={handleUpload}
        className="hidden"
      />

      {hasFile ? (
        <div className="space-y-3">
          <div className="p-4 rounded-lg border-2 border-success/30 bg-success/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/20">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-success">Certificado A1 armazenado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Lock className="w-3 h-3 inline mr-1" />
                  {fileName} — Criptografado no storage privado
                </p>
              </div>
              <Badge className="bg-success/20 text-success border-success/30">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Pronto
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Substituir
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemove} disabled={uploading}>
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full p-6 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-all flex flex-col items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <KeyRound className="w-8 h-8 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="font-semibold text-sm">{uploading ? 'Enviando...' : 'Clique para enviar o certificado A1'}</p>
            <p className="text-xs text-muted-foreground mt-1">.pfx ou .p12 — até 5MB</p>
          </div>
        </button>
      )}

      {/* Senha do certificado */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          Senha do Certificado (usada pelo robô para autenticação)
        </Label>
        <Input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          placeholder="Senha do arquivo .pfx"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          A senha é armazenada de forma segura e usada apenas para desbloquear o certificado durante a autenticação automática.
        </p>
      </div>

      {/* ─── Teste de Login Gov.br ─── */}
      {hasFile && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm">Testar Login Gov.br</p>
              </div>
              {testStatus === 'polling' && (
                <Badge variant="outline" className="gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {testElapsed}s
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Verifica se o certificado A1 e a senha estão corretos, testando o login real no Gov.br via robô.
            </p>

            {/* Test result feedback */}
            {testStatus === 'success' && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <p className="text-sm text-success font-medium">Login realizado com sucesso! Certificado funcionando.</p>
              </div>
            )}

            {testStatus === 'error' && testError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive font-medium">Falha no login</p>
                </div>
                <p className="text-xs text-destructive/80 pl-6">{testError}</p>
              </div>
            )}

            {testStatus === 'polling' && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                <div>
                  <p className="text-sm text-primary font-medium">Testando login...</p>
                  <p className="text-xs text-muted-foreground">O robô está tentando autenticar no Gov.br. Isso pode levar até 2 minutos.</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleTestLogin}
              disabled={testStatus === 'starting' || testStatus === 'polling' || !hasFile}
              className="w-full gap-2"
              variant={testStatus === 'success' ? 'outline' : 'default'}
            >
              {testStatus === 'starting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testStatus === 'polling' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {testStatus === 'starting' ? 'Iniciando...' : 
               testStatus === 'polling' ? 'Aguardando resultado...' :
               testStatus === 'success' ? 'Testar Novamente' :
               testStatus === 'error' ? 'Tentar Novamente' :
               'Testar Login Gov.br'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <strong>Segurança:</strong> O certificado é armazenado em bucket privado com criptografia. 
          Apenas o seu usuário tem acesso. Nenhum dado é compartilhado com terceiros.
        </p>
      </div>
    </div>
  );
}
