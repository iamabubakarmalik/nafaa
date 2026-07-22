import { apiClient } from '@core/api/client';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'DEFAULTED' | 'OVERDUE';

export interface CreditAccount {
  id: string;
  accountNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerCnic?: string;
  businessName?: string;
  businessAddress?: string;
  status: AccountStatus;
  creditLimit: number;
  creditDays: number;
  interestRateMonthly: number;
  currentBalance: number;
  totalPurchases: number;
  totalPayments: number;
  totalWriteOffs: number;
  totalInterest: number;
  age0To30Days: number;
  age31To60Days: number;
  age61To90Days: number;
  ageOver90Days: number;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorCnic?: string;
  guarantorRelation?: string;
  chequeSecurity?: string;
  postDatedCheques: string[];
  referredBy?: string;
  openedByStaffId?: string;
  openingDate: string;
  closedAt?: string;
  lastPurchaseDate?: string;
  lastPaymentDate?: string;
  lastReminderDate?: string;
  notes?: string;
  documentsUrls: string[];
  recentTransactions?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const creditAccountsApi = {
  create: (data: Partial<CreditAccount>) => apiClient.post('/hardware/credit-accounts', data).then(unwrap<CreditAccount>),
  list: (params?: any) => apiClient.get('/hardware/credit-accounts', { params }).then(unwrap<CreditAccount[]>),
  agingReport: () => apiClient.get('/hardware/credit-accounts/aging-report').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/hardware/credit-accounts/' + id).then(unwrap<CreditAccount>),
  update: (id: string, data: Partial<CreditAccount>) => apiClient.patch('/hardware/credit-accounts/' + id, data).then(unwrap<CreditAccount>),
  suspend: (id: string, reason?: string) => apiClient.post('/hardware/credit-accounts/' + id + '/suspend', { reason }).then(unwrap<CreditAccount>),
  reactivate: (id: string) => apiClient.post('/hardware/credit-accounts/' + id + '/reactivate').then(unwrap<CreditAccount>),
  close: (id: string, reason?: string) => apiClient.post('/hardware/credit-accounts/' + id + '/close', { reason }).then(unwrap<CreditAccount>),
  recalculateAging: (id: string) => apiClient.post('/hardware/credit-accounts/' + id + '/recalculate-aging').then(unwrap<CreditAccount>),
};
