// Types for the bidding/tender management system

export type Portal = 
  | 'PNCP' 
  | 'ComprasNet' 
  | 'ComprasPublicas' 
  | 'BLL' 
  | 'Caixa' 
  | 'BB' 
  | 'Portal Estadual' 
  | 'Portal Municipal';

export type Modalidade = 
  | 'Dispensa com Disputa' 
  | 'Dispensa sem Disputa' 
  | 'Compra Direta';

export type ComplianceStatus = 'Apta' | 'Apta c/ Ressalva' | 'Inapta';

export type LicitacaoStatus = 
  | 'Nova' 
  | 'Em Análise' 
  | 'Aguardando Autorização' 
  | 'Autorizada' 
  | 'Em Disputa' 
  | 'Vencida' 
  | 'Perdida' 
  | 'Cancelada';

export type Segmento = 'Medicamentos' | 'Empreendimentos';

export interface Licitacao {
  id: string;
  portal: Portal;
  numero: string;
  orgao: string;
  uasg?: string;
  municipio: string;
  uf: string;
  objeto: string;
  objetoResumido: string;
  valor: number;
  modalidade: Modalidade;
  dataAbertura: Date;
  dataLimite: Date;
  status: LicitacaoStatus;
  segmento: Segmento;
  compliance: ComplianceStatus;
  roiScore: number;
  riscoScore: number;
  metodoEnvio?: 'portal' | 'email' | 'presencial';
  emailDestino?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnaliseEdital {
  id: string;
  licitacaoId: string;
  exigencias: string[];
  criterios: string[];
  riscos: string[];
  penalidades: string[];
  prazoEntrega: string;
  localEntrega: string;
  condicoesPagemento: string;
}

export interface Cotacao {
  id: string;
  licitacaoId: string;
  precoReferencia: number;
  icmsUf: number;
  custoLogistica: number;
  margemMinima: number;
  precoSugerido: number;
  precoFinal: number;
  margemFinal: number;
}

export interface MetricaDashboard {
  label: string;
  value: number | string;
  variacao?: number;
  icon: string;
}

export interface FiltrosLicitacao {
  portal?: Portal[];
  modalidade?: Modalidade[];
  segmento?: Segmento[];
  status?: LicitacaoStatus[];
  valorMin?: number;
  valorMax?: number;
  uf?: string[];
  busca?: string;
}
