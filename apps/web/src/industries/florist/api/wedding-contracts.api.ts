import { apiClient } from '@core/api/client';

export interface WeddingContract {
  id: string;
  contractNumber: string;
  brideName: string;
  groomName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  weddingDate: string;
  ceremonyVenue?: string;
  receptionVenue?: string;
  city?: string;
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
  styleInspiration?: string;
  moodBoardUrls: string[];
  quotedAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  siteVisitDate?: string;
  setupStartTime?: string;
  status: string;
  confirmedAt?: string;
  notes?: string;
  internalNotes?: string;
  handledById?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const weddingContractsApi = {
  create: (data: Partial<WeddingContract>) =>
    apiClient.post('/florist/wedding-contracts', data).then(unwrap<WeddingContract>),

  list: (params?: { status?: string; upcoming?: boolean; search?: string }) =>
    apiClient.get('/florist/wedding-contracts', { params }).then(unwrap<WeddingContract[]>),

  upcoming: (days = 30) =>
    apiClient.get('/florist/wedding-contracts/upcoming', { params: { days } }).then(unwrap<WeddingContract[]>),

  getOne: (id: string) => apiClient.get('/florist/wedding-contracts/' + id).then(unwrap<WeddingContract>),

  update: (id: string, data: Partial<WeddingContract>) =>
    apiClient.patch('/florist/wedding-contracts/' + id, data).then(unwrap<WeddingContract>),

  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch('/florist/wedding-contracts/' + id + '/status', data).then(unwrap<WeddingContract>),

  recordPayment: (id: string, data: { amount: number; notes?: string }) =>
    apiClient.post('/florist/wedding-contracts/' + id + '/payment', data).then(unwrap<WeddingContract>),

  remove: (id: string) => apiClient.delete('/florist/wedding-contracts/' + id).then(unwrap),
};
