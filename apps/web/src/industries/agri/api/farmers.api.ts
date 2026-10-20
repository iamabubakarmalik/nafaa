import { apiClient } from '@core/api/client';

export type FarmerStatus = 'ACTIVE' | 'SUSPENDED' | 'DEFAULTED' | 'CLOSED' | 'PENDING_APPROVAL';

export interface Farmer {
  id: string;
  customerId?: string;
  farmerNumber: string;
  fullName: string;
  fatherName?: string;
  cnic?: string;
  phone: string;
  altPhone?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  province?: string;
  address?: string;
  landmark?: string;
  landAreaAcres?: number;
  landAreaKanals?: number;
  landOwnership?: string;
  soilType?: string;
  waterSource?: string;
  irrigationType?: string;
  farmingType: string[];
  primaryCrops: string[];
  livestock?: any;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  landDocUrl?: string;
  photoUrl?: string;
  creditLimit: number;
  currentBalance: number;
  creditDays: number;
  interestRate: number;
  currentSeason?: string;
  currentCrop?: string;
  totalOrders: number;
  totalPurchases: number;
  totalOutstanding: number;
  totalPaid: number;
  lastPurchaseAt?: string;
  status: FarmerStatus;
  registeredAt: string;
  suspendedAt?: string;
  suspensionReason?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Live khata figures laid over the farmer row by the API. */
  khataLinked?: boolean;
  advance?: number;
  dueNow?: number;
  notDue?: number;
  overLimit?: boolean;
  lastPaymentAt?: string | null;
  seasons?: SeasonOwed[];
  currentSeasonLabel?: string;
}

/** Udhaar still owed from one crop season and when it is expected back. */
export interface SeasonOwed { key: string; label: string; owed: number; recoveryBy: string; due: boolean }

export type FarmerTab = 'all' | 'owing' | 'due' | 'over' | 'suspended';

export interface FarmerPage {
  items: Farmer[];
  total: number;
  page: number;
  limit: number;
  counts: Record<FarmerTab, number>;
  stats: { farmers: number; owed: number; dueNow: number; notDue: number; advance: number; creditLimit: number; acres: number; season: string };
  analytics: { crops: Array<{ name: string; count: number }>; districts: Array<{ name: string; count: number }>; seasons: Array<{ key: string; label: string; owed: number; due: boolean }> };
}

export interface KhataSeason { key: string; label: string; recoveryBy: string; udhaar: number; received: number; other: number; opening: number; closing: number }
export interface KhataEntry { id: string; type: string; amount: number; balanceAfter: number; reference?: string | null; note?: string | null; paymentMethod?: string | null; createdAt: string }
export interface FarmerKhata { farmer: Farmer; seasons: KhataSeason[]; entries: KhataEntry[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const farmersApi = {
  create: (data: Partial<Farmer>) => apiClient.post('/agri/farmers', data).then(unwrap<Farmer>),
  list: (params?: { search?: string; status?: string; district?: string }) => apiClient.get('/agri/farmers', { params }).then(unwrap<Farmer[]>),
  page: (params: { search?: string; tab?: FarmerTab; sort?: string; page?: number; limit?: number }) => apiClient.get('/agri/farmers/page', { params }).then(unwrap<FarmerPage>),
  khata: (id: string) => apiClient.get('/agri/farmers/' + id + '/khata').then(unwrap<FarmerKhata>),
  byCustomer: (customerId: string) => apiClient.get('/agri/farmers/by-customer/' + customerId).then(unwrap<Farmer | null>),
  /** Links an older farmer to a customer khata; without customerId a new customer is made. */
  linkCustomer: (id: string, customerId?: string) =>
    apiClient.post('/agri/farmers/' + id + '/link-customer', { customerId }).then(unwrap<Farmer>),
  getOne: (id: string) => apiClient.get('/agri/farmers/' + id).then(unwrap<Farmer>),
  update: (id: string, data: Partial<Farmer>) => apiClient.patch('/agri/farmers/' + id, data).then(unwrap<Farmer>),
  suspend: (id: string, reason: string) => apiClient.post('/agri/farmers/' + id + '/suspend', { reason }).then(unwrap<Farmer>),
  reactivate: (id: string) => apiClient.post('/agri/farmers/' + id + '/reactivate').then(unwrap<Farmer>),
  /** Money received from the farmer, written on the customer khata. */
  payment: (id: string, body: { amount: number; paymentMethod: string; note?: string }) => apiClient.post('/agri/farmers/' + id + '/payment', body).then(unwrap<Farmer>),
  /** Hides the farmer from lists (record and khata stay). */
  remove: (id: string) => apiClient.delete('/agri/farmers/' + id).then(unwrap),
};
