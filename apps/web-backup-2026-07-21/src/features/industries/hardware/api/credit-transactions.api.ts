import { apiClient } from '@/api/client';

export type TransactionType = 'SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND' | 'WRITE_OFF' | 'INTEREST' | 'OPENING_BALANCE';

export interface CreditTransaction {
  id: string;
  accountId: string;
  transactionNumber: string;
  transactionType: TransactionType;
  transactionDate: string;
  amount: number;
  runningBalance: number;
  saleId?: string;
  deliveryId?: string;
  paymentMethod?: string;
  paymentReference?: string;
  description: string;
  notes?: string;
  attachmentUrls: string[];
  handledById?: string;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const creditTransactionsApi = {
  create: (data: Partial<CreditTransaction>) => apiClient.post('/hardware/credit-transactions', data).then(unwrap<CreditTransaction>),
  list: (params?: any) => apiClient.get('/hardware/credit-transactions', { params }).then(unwrap<CreditTransaction[]>),
  statement: (accountId: string, from?: string, to?: string) =>
    apiClient.get('/hardware/credit-transactions/statement/' + accountId, { params: { from, to } }).then(unwrap<any>),
  reverse: (id: string, reason: string) => apiClient.post('/hardware/credit-transactions/' + id + '/reverse', { reason }).then(unwrap<CreditTransaction>),
};
