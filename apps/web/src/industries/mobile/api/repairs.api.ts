import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type RepairStatus =
  | 'RECEIVED'
  | 'DIAGNOSED'
  | 'AWAITING_APPROVAL'
  | 'AWAITING_PARTS'
  | 'IN_PROGRESS'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'UNREPAIRABLE';

export type RepairPriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';
export type RepairPaymentStatus = 'PENDING' | 'ADVANCE_PAID' | 'FULLY_PAID';
export type RepairView = 'open' | 'working' | 'ready' | 'handover' | 'late' | 'unpaid' | 'closed' | 'warranty' | 'all';
export type RepairSort = 'new' | 'old' | 'due' | 'amount';
export type PartSource = 'OWN_STOCK' | 'PURCHASED_FOR_REPAIR' | 'CUSTOMER_PROVIDED';

/** Allowed next statuses; DELIVERED always goes through the deliver step. */
export const REPAIR_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ['DIAGNOSED', 'CANCELLED', 'UNREPAIRABLE'],
  DIAGNOSED: ['AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
  AWAITING_APPROVAL: ['AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
  AWAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'AWAITING_PARTS', 'UNREPAIRABLE', 'CANCELLED'],
  READY: ['DELIVERED', 'IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: [],
  UNREPAIRABLE: ['DELIVERED', 'CANCELLED'],
};

export interface RepairPart {
  id: string;
  ticketId: string;
  productId?: string | null;
  partName: string;
  partNumber?: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  source?: string | null;
  notes?: string | null;
  createdAt: string;
  product?: { id: string; name: string; unit: string } | null;
}

export interface RepairStatusLog {
  id: string;
  fromStatus?: RepairStatus | null;
  toStatus: RepairStatus;
  note?: string | null;
  changedAt: string;
}

export interface RepairPaymentRecord {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
}

export interface RepairTicket {
  id: string;
  shopId?: string | null;
  ticketNumber: string;
  imei1?: string | null;
  imei2?: string | null;
  serialNumber?: string | null;
  deviceBrand: string;
  deviceModel: string;
  deviceColor?: string | null;
  passcode?: string | null;
  hasSimCard: boolean;
  hasMemoryCard: boolean;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerCnic?: string | null;
  customerAddress?: string | null;
  reportedIssue: string;
  diagnosedIssue?: string | null;
  diagnosisNotes?: string | null;
  recommendedActions?: string | null;
  status: RepairStatus;
  priority: RepairPriority;
  paymentStatus: RepairPaymentStatus;
  estimatedCost: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  advancePaid: number;
  paidAmount: number;
  balanceDue: number;
  discount: number;
  receivedAt: string;
  diagnosedAt?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  estimatedReadyAt?: string | null;
  technicianId?: string | null;
  technicianName?: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  notes?: string | null;
  warrantyDays: number;
  warrantyEnds?: string | null;
  saleId?: string | null;
  customer?: { id: string; name: string; phone?: string | null; cnic?: string | null; address?: string | null; balance?: number } | null;
  shop?: { id: string; name: string } | null;
  sale?: { id: string; saleNumber: string; total?: number; paidAmount?: number; creditAmount?: number; status?: string } | null;
  parts?: RepairPart[];
  statusLog?: RepairStatusLog[];
  payments?: RepairPaymentRecord[];
  /** Detail only: the earlier job this one is a warranty claim of. */
  warrantyOf?: { id: string; ticketNumber: string; status: RepairStatus; deliveredAt: string | null; warrantyEnds: string | null; reportedIssue: string; diagnosedIssue: string | null } | null;
  /** Detail only: warranty claims made on this job. */
  warrantyRepairs?: Array<{ id: string; ticketNumber: string; status: RepairStatus; receivedAt: string; reportedIssue: string }>;
  _count?: { parts: number; payments: number };
  /** List only. */
  isLate?: boolean;
  daysInShop?: number;
  warrantyActive?: boolean;
}

interface RepairListPage {
  items: RepairTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Partial<Record<RepairStatus, number>>;
  totals: { bill: number; estimate: number; paid: number; due: number };
}

export interface RepairStats {
  byStatus: { status: RepairStatus; count: number }[];
  byPriority: { priority: RepairPriority; count: number }[];
  todayCount: number;
  monthRevenue: number;
  monthDelivered: number;
  totalRevenue: number;
  totalDelivered: number;
  openTickets: number;
  late: number;
  readyDue: number;
  deliveredToday: number;
}

export interface RepairListParams {
  search?: string;
  status?: RepairStatus;
  priority?: RepairPriority;
  view?: RepairView;
  technician?: string;
  customerId?: string;
  shopId?: string;
  from?: string;
  to?: string;
  sort?: RepairSort;
  page?: number;
  limit?: number;
}

export interface RepairTicketPayload {
  shopId?: string;
  imei1?: string;
  imei2?: string;
  serialNumber?: string;
  deviceBrand: string;
  deviceModel: string;
  deviceColor?: string;
  passcode?: string;
  hasSimCard?: boolean;
  hasMemoryCard?: boolean;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  customerAddress?: string;
  reportedIssue: string;
  priority?: RepairPriority;
  estimatedCost?: number;
  advancePaid?: number;
  advanceMethod?: PaymentMethod;
  estimatedReadyAt?: string;
  technicianName?: string;
  beforePhotos?: string[];
  notes?: string;
  warrantyDays?: number;
  warrantyOf?: string;
}

interface DiagnosePayload {
  diagnosedIssue: string;
  diagnosisNotes?: string;
  recommendedActions?: string;
  estimatedCost: number;
  laborCost?: number;
}

interface AddPartPayload {
  productId?: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number;
  source?: PartSource;
  notes?: string;
}

const unwrap = (res: { data?: unknown }) => {
  const body = res?.data as { data?: unknown } | undefined;
  return body?.data !== undefined ? body.data : body;
};

export const repairsApi = {
  list: (params?: RepairListParams) =>
    apiClient.get('/repair-tickets', { params }).then(unwrap) as Promise<RepairListPage>,

  stats: (shopId?: string) =>
    apiClient.get('/repair-tickets/stats', { params: { shopId } }).then(unwrap) as Promise<RepairStats>,

  technicians: () =>
    apiClient.get('/repair-tickets/technicians').then(unwrap) as Promise<Array<{ name: string; total: number; open: number }>>,

  /** One step at the counter: take the balance, hand the phone back, post the bill. */
  deliver: (id: string, payload: { amount?: number; paymentMethod?: string; note?: string }) =>
    apiClient.post(`/repair-tickets/${id}/deliver`, payload).then(unwrap) as Promise<{
      ticket: RepairTicket;
      sale: { id: string; saleNumber: string; total: number; paidAmount?: number; creditAmount?: number } | null;
    }>,

  getOne: (id: string) => apiClient.get(`/repair-tickets/${id}`).then(unwrap) as Promise<RepairTicket>,

  create: (payload: RepairTicketPayload) => apiClient.post('/repair-tickets', payload).then(unwrap) as Promise<RepairTicket>,

  update: (id: string, payload: Partial<RepairTicketPayload> & { laborCost?: number; discount?: number; afterPhotos?: string[] }) =>
    apiClient.patch(`/repair-tickets/${id}`, payload).then(unwrap) as Promise<RepairTicket>,

  diagnose: (id: string, payload: DiagnosePayload) =>
    apiClient.post(`/repair-tickets/${id}/diagnose`, payload).then(unwrap) as Promise<RepairTicket>,

  addPart: (id: string, payload: AddPartPayload) =>
    apiClient.post(`/repair-tickets/${id}/parts`, payload).then(unwrap) as Promise<RepairPart>,

  removePart: (id: string, partId: string) =>
    apiClient.delete(`/repair-tickets/${id}/parts/${partId}`).then(unwrap) as Promise<RepairTicket>,

  updateStatus: (id: string, payload: { toStatus: RepairStatus; note?: string }) =>
    apiClient.patch(`/repair-tickets/${id}/status`, payload).then(unwrap) as Promise<RepairTicket>,

  addPayment: (id: string, payload: { amount: number; paymentMethod?: PaymentMethod; reference?: string; notes?: string }) =>
    apiClient.post(`/repair-tickets/${id}/payments`, payload).then(unwrap) as Promise<RepairPaymentRecord>,
};
