export type FbrSubmissionMode = 'DISABLED' | 'MANUAL' | 'AUTO_ALL' | 'AUTO_ABOVE_LIMIT';
export type FbrEnvironment = 'SANDBOX' | 'PRODUCTION';
export type FbrInvoiceStatus =
  | 'PENDING' | 'SUBMITTING' | 'SUBMITTED' | 'ACKNOWLEDGED'
  | 'REJECTED' | 'RETRY_QUEUED' | 'MANUAL_SKIPPED' | 'CANCELLED';

export interface FbrConfig {
  id: string;
  tenantId: string;
  isEnabled: boolean;
  submissionMode: FbrSubmissionMode;
  environment: FbrEnvironment;
  autoSubmitThreshold?: number | null;
  posId?: string | null;
  ntn?: string | null;
  strn?: string | null;
  apiToken?: string | null;
  apiEndpoint?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  province?: string | null;
  defaultTaxRate: number;
  taxInclusive: boolean;
  printQrOnReceipt: boolean;
  printFbrLogo: boolean;
  askBeforeSubmit: boolean;
  hideNonFbrSales: boolean;
  retentionMonths: number;
  totalSubmitted: number;
  totalRejected: number;
  totalSkipped: number;
  lastSubmissionAt?: string | null;
  isVerified: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: FbrStats;
}

export interface FbrStats {
  submitted: number;
  rejected: number;
  pending: number;
  skipped: number;
  last30DaysAmount: number;
  last30DaysTax: number;
}

export interface FbrInvoice {
  id: string;
  tenantId: string;
  configId: string;
  saleId: string;
  invoiceNumber: string;
  status: FbrInvoiceStatus;
  fbrInvoiceNumber?: string | null;
  fbrQrCode?: string | null;
  fbrVerificationUrl?: string | null;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  taxRate: number;
  errorMessage?: string | null;
  retryCount: number;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  skippedReason?: string | null;
  createdAt: string;
}

export interface FbrMonthlyReport {
  period: string;
  totalInvoices: number;
  totalNet: number;
  totalTax: number;
  totalGross: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    fbrInvoiceNumber: string | null;
    submittedAt: string | null;
    totalAmount: number;
    taxAmount: number;
    netAmount: number;
  }>;
}
