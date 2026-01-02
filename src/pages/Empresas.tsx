import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  FileText,
  Calendar,
  MapPin
} from 'lucide-react';

const empresas = [
  {
    id: '1',
    nome: 'Farma Distribuidora LTDA',
    cnpj: '12.345.678/0001-90',
    segmento: 'Medicamentos',
    sicafStatus: 'Regular',
    certidoesValidas: true,
    uf: 'SP',
    municipio: 'São Paulo',
    ultimaAtualizacao: '2026-01-02',
  },
  {
    id: '2',
    nome: 'Tech Supplies Comércio',
    cnpj: '98.765.432/0001-10',
    segmento: 'Empreendimentos',
    sicafStatus: 'Regular',
    certidoesValidas: true,
    uf: 'RJ',
    municipio: 'Rio de Janeiro',
    ultimaAtualizacao: '2026-01-01',
  },
  {
    id: '3',
    nome: 'Serviços Gerais do Nordeste',
    cnpj: '11.222.333/0001-44',
    segmento: 'Empreendimentos',
    sicafStatus: 'Pendente',
    certidoesValidas: false,
    uf: 'PE',
    municipio: 'Recife',
    ultimaAtualizacao: '2025-12-28',
  },
];

const Empresas = () => {
  return (
    <MainLayout title="Empresas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Gerencie as empresas vinculadas ao sistema de licitações
          </p>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Empresa
          </Button>
        </div>

        <div className="grid gap-4">
          {empresas.map((empresa, index) => (
            <div 
              key={empresa.id}
              className="glass-card p-6 animate-slide-up opacity-0"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{empresa.nome}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{empresa.cnpj}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{empresa.municipio}/{empresa.uf}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Atualizado em {empresa.ultimaAtualizacao}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge variant={empresa.segmento === 'Medicamentos' ? 'portal' : 'modalidade'}>
                    {empresa.segmento}
                  </Badge>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {empresa.sicafStatus === 'Regular' ? (
                      <div className="flex items-center gap-1.5 text-success text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>SICAF Regular</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-warning text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>SICAF Pendente</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {empresa.certidoesValidas ? (
                      <div className="flex items-center gap-1.5 text-success text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Certidões OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-destructive text-sm">
                        <XCircle className="w-4 h-4" />
                        <span>Certidões Vencidas</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    12 licitações participadas • 8 vencidas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Ver Documentos</Button>
                  <Button variant="outline" size="sm">Editar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Empresas;
