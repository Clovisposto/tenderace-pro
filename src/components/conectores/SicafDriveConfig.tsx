import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { FolderSync, RefreshCw, CheckCircle2, FolderPlus, Sparkles } from 'lucide-react';

interface Folder { id: string; name: string }

export function SicafDriveConfig() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [folderName, setFolderName] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('sicaf_drive_config').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setFolderId(data.folder_id);
      setFolderName(data.folder_name || '');
      setAtivo(data.ativo);
      setUltimaSync(data.ultima_sincronizacao);
    }
  }

  async function loadFolders() {
    setLoading(true);
    try {
      const url = `https://ccsmnqqwobrsvepwacrg.supabase.co/functions/v1/sicaf-drive-sync?action=list-folders`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFolders(json.folders || []);
      toast.success(`${json.folders?.length || 0} pastas encontradas`);
    } catch (e: any) {
      toast.error('Erro ao listar pastas: ' + e.message);
    } finally { setLoading(false); }
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !folderId) return toast.error('Selecione uma pasta');
    const { error } = await supabase.from('sicaf_drive_config').upsert({
      user_id: user.id, folder_id: folderId, folder_name: folderName, ativo,
    }, { onConflict: 'user_id' });
    if (error) return toast.error(error.message);
    toast.success('Configuração salva. Sincronização automática a cada 15 minutos.');
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sicaf-drive-sync');
      if (error) throw error;
      toast.success('Sincronização concluída');
      load();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally { setSyncing(false); }
  }

  async function createSicafFolder() {
    setLoading(true);
    try {
      const url = `https://ccsmnqqwobrsvepwacrg.supabase.co/functions/v1/sicaf-drive-sync?action=ensure-folder`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFolderId(json.folder.id);
      setFolderName(json.folder.name);
      toast.success(`Pasta "${json.folder.name}" pronta no Google Drive`);
      // auto-save
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('sicaf_drive_config').upsert({
          user_id: user.id, folder_id: json.folder.id, folder_name: json.folder.name, ativo: true,
        }, { onConflict: 'user_id' });
      }
    } catch (e: any) {
      toast.error('Erro ao criar pasta: ' + e.message);
    } finally { setLoading(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderSync className="h-5 w-5" /> Sincronização Google Drive — SICAF
        </CardTitle>
        <CardDescription>
          Monitora uma pasta do Drive e atualiza documentos SICAF automaticamente a cada 15 minutos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <strong>IA inteligente ativada:</strong> A cada 15 minutos, lemos os PDFs da pasta,
            extraímos CNPJ/validade/status com Gemini e atualizamos o SICAF de cada empresa automaticamente.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={createSicafFolder} disabled={loading}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Criar pasta SICAF no Drive
          </Button>
          <Button onClick={loadFolders} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Listar pastas existentes
          </Button>
        </div>

        {folders.length > 0 && (
          <Select
            value={folderId}
            onValueChange={(v) => {
              setFolderId(v);
              setFolderName(folders.find(f => f.id === v)?.name || '');
            }}
          >
            <SelectTrigger><SelectValue placeholder="Selecione a pasta" /></SelectTrigger>
            <SelectContent>
              {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {folderName && (
          <div className="flex items-center justify-between p-3 rounded-md border bg-muted/40">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Pasta atual: <Badge variant="secondary">{folderName}</Badge>
              </div>
              {ultimaSync && (
                <div className="text-xs text-muted-foreground mt-1">
                  Última sincronização: {new Date(ultimaSync).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Ativo</span>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={save} disabled={!folderId}>Salvar</Button>
          <Button onClick={syncNow} disabled={!folderId || syncing} variant="secondary">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
