export type DocTabType = 'SPK' | 'NDA' | 'BAST';
export type PackageType = 'SINGLE' | 'BUNDLING';

export interface DocumentFormData {
  freelancerName: string;
  freelancerWa: string;
  clientName: string;
  clientWa: string;
  projectTitle: string;
  projectAmount: string;
  dpPercent: string;
  bankInfo: string;
  ndaScope: string;
  ndaYears: string;
  ndaPenalty: string;
  bastRef: string;
  bastWarranty: string;
  bastDate: string;
  clauseRevision: boolean;
  clauseSla: boolean;
  clauseRetention: boolean;
  clauseDp: boolean;
  customClause: string;
}

export interface ClausesConfig {
  spk: {
    title: string;
    pasal1: { heading: string; template: string };
    pasal2: { heading: string; template: string };
    pasal3: { heading: string };
  };
  nda: {
    title: string;
    pasal1: { heading: string; template: string };
    pasal2: { heading: string; template: string };
  };
  bast: {
    title: string;
    pasal1: { heading: string; template: string };
    pasal2: { heading: string; template: string };
  };
  protectionClauses: Record<string, { label: string; description: string; legalText: string }>;
  legalBases: string[];
}