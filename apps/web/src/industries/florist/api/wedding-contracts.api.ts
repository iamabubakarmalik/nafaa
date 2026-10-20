import { apiClient } from '@core/api/client';

export type WeddingStatus = 'QUOTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface WeddingContract {
  id: string;
  contractNumber: string;
  brideName: string;
  groomName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string | null;
  weddingDate: string;
  ceremonyVenue?: string | null;
  receptionVenue?: string | null;
  city?: string | null;
  includesBridalBouquet: boolean;
  includesBridesmaidBouquets: boolean;
  bridesmaidCount: number;
  includesBoutonnieres: boolean;
  boutonniereCount: number;
  includesGarlands: boolean;
  garlandCount: number;
  includesCarDecoration: boolean;
  includesStageDecoration: boolean;
  includesMehndiSetup: boolean;
  includesTableCentrepieces: boolean;
  centrepieceCount: number;
  colorTheme: string[];
  primaryFlowers: string[];
  styleInspiration?: string | null;
  quotedAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  finalAmount: number;
  siteVisitDate?: string | null;
  setupStartTime?: string | null;
  status: WeddingStatus;
  confirmedAt?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields the contract form sends; money taken only through `advanceAmount` (new) and payments. */
export interface WeddingInput {
  brideName: string; groomName: string; contactPerson: string; contactPhone: string; contactEmail?: string;
  weddingDate: string; ceremonyVenue?: string; receptionVenue?: string; city?: string;
  includesBridalBouquet?: boolean; includesBridesmaidBouquets?: boolean; bridesmaidCount?: number; includesBoutonnieres?: boolean; boutonniereCount?: number;
  includesGarlands?: boolean; garlandCount?: number; includesCarDecoration?: boolean; includesStageDecoration?: boolean; includesMehndiSetup?: boolean;
  includesTableCentrepieces?: boolean; centrepieceCount?: number; colorTheme?: string[]; primaryFlowers?: string[]; styleInspiration?: string;
  quotedAmount: number; advanceAmount?: number; advancePaymentMethod?: string; siteVisitDate?: string | null; notes?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope varies by endpoint
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export interface WeddingPage {
  items: WeddingContract[]; total: number; page: number; limit: number;
  totals: { quoted: number; received: number; due: number };
  counts: Partial<Record<WeddingStatus, number>>;
}

export const weddingContractsApi = {
  /** `status` may be OPEN (quoted, confirmed, in progress); `from`/`to` filter the wedding day. */
  paged: (params: { status?: string; search?: string; from?: string; to?: string; upcoming?: boolean; page?: number; limit?: number }) =>
    apiClient.get('/florist/wedding-contracts/paged', { params }).then(unwrap<WeddingPage>),

  create: (data: WeddingInput) =>
    apiClient.post('/florist/wedding-contracts', data).then(unwrap<WeddingContract>),

  list: (params?: { status?: string; upcoming?: boolean; search?: string }) =>
    apiClient.get('/florist/wedding-contracts', { params }).then(unwrap<WeddingContract[]>),

  update: (id: string, data: Partial<WeddingInput>) =>
    apiClient.patch('/florist/wedding-contracts/' + id, data).then(unwrap<WeddingContract>),

  /** COMPLETED makes the bill; the payments on the khata cover it. */
  updateStatus: (id: string, data: { status: WeddingStatus; notes?: string; materials?: Array<{ productId: string; quantity: number }> }) =>
    apiClient.patch('/florist/wedding-contracts/' + id + '/status', data).then(unwrap<WeddingContract & { sale?: { id: string; saleNumber: string } }>),

  recordPayment: (id: string, data: { amount: number; paymentMethod: string; notes?: string }) =>
    apiClient.post('/florist/wedding-contracts/' + id + '/payment', data).then(unwrap<WeddingContract>),

  /** Cancels the contract (nothing is deleted). */
  cancel: (id: string) => apiClient.delete('/florist/wedding-contracts/' + id).then(unwrap<WeddingContract>),
};
