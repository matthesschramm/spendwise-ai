
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  confidence?: number;
  groundingSources?: GroundingSource[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SavedReport {
  id: string;
  name: string;
  timestamp: number;
  transactions: Transaction[];
  totalSpent: number;
}

export enum AppState {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  COMPARING = 'COMPARING',
  MONTHLY_VIEW = 'MONTHLY_VIEW',
  MID_MONTH_VIEW = 'MID_MONTH_VIEW'
}
