
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  discretionary?: boolean;
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
  status: 'processing' | 'completed';
  progress: number; // 0 to 100
}

export enum AppState {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  COMPARING = 'COMPARING',
  MONTHLY_VIEW = 'MONTHLY_VIEW',
  MID_MONTH_VIEW = 'MID_MONTH_VIEW',
  PERIOD_DASHBOARD = 'PERIOD_DASHBOARD'
}
