import { apiClient } from '@/api/client';
import type { PaymentMethod } from '@/api/sales.api';

// ─── Types ─────────────────────────────────────────────────

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

// ─── Status Labels & Colors ────────────────────────────────

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  RECEIVED: 'Received',
  DIAGNOSED: 'Diagnosed',
  AWAITING_APPROVAL: 'Awaiting Approval',
  AWAITING_PARTS: 'Awaiting Parts',
  IN_PROGRESS: 'In Progress',
  READY: 'Ready for Pickup',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  UNREPAIRABLE: 'Unrepairable',
};

export const REPAIR_STATUS_COLORS: Record<RepairStatus, { bg: string; text: string; border: string }> = {
  RECEIVED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  DIAGNOSED: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  AWAITING_APPROVAL: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  AWAITING_PARTS: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  IN_PROGRESS: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  READY: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  DELIVERED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  CANCELLED: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  UNREPAIRABLE: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

// ─── Priority Labels & Colors ──────────────────────────────

export const REPAIR_PRIORITY_LABELS: Record<RepairPriority, string> = {
  NORMAL: 'Normal',
  URGENT: 'Urgent',
  EMERGENCY: 'Emergency',
};

export const REPAIR_PRIORITY_COLORS: Record<RepairPriority, { bg: string; text: string; border: string }> = {
  NORMAL: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  URGENT: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  EMERGENCY: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
};

// ─── Valid Status Transitions ──────────────────────────────

export const VALID_STATUS_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ['DIAGNOSED', 'CANCELLED', 'UNREPAIRABLE'],
  DIAGNOSED: ['AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
  AWAITING_APPROVAL: ['AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED'],
  AWAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'UNREPAIRABLE', 'CANCELLED'],
  READY: ['DELIVERED', 'IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: [],
  UNREPAIRABLE: ['CANCELLED'],
};

// ─── Interfaces ────────────────────────────────────────────

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
  ticketId: string;
  fromStatus?: RepairStatus | null;
  toStatus: RepairStatus;
  note?: string | null;
  changedById?: string | null;
  changedAt: string;
}

export interface RepairPaymentRecord {
  id: string;
  ticketId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
}

export interface RepairTicket {
  id: string;
  tenantId: string;
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
  approvedAt?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  estimatedReadyAt?: string | null;
  technicianId?: string | null;
  technicianName?: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  signatureUrl?: string | null;
  smsNotificationsSent: number;
  lastSmsSentAt?: string | null;
  notes?: string | null;
  warrantyDays: number;
  warrantyEnds?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    cnic?: string | null;
    address?: string | null;
  } | null;
  shop?: { id: string; name: string } | null;
  parts?: RepairPart[];
  statusLog?: RepairStatusLog[];
  payments?: RepairPaymentRecord[];
  _count?: { parts: number; payments: number };
}

export interface RepairStats {
  byStatus: { status: RepairStatus; count: number }[];
  byPriority: { priority: RepairPriority; count: number }[];
  todayCount: number;
  monthRevenue: number;
  totalRevenue: number;
  totalDelivered: number;
  openTickets: number;
}

// ─── Payloads ──────────────────────────────────────────────

export interface CreateRepairTicketPayload {
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
  estimatedReadyAt?: string;
  technicianId?: string;
  technicianName?: string;
  beforePhotos?: string[];
  notes?: string;
  warrantyDays?: number;
}

export interface DiagnosePayload {
  diagnosedIssue: string;
  diagnosisNotes?: string;
  recommendedActions?: string;
  estimatedCost: number;
  partsCost?: number;
  laborCost?: number;
}

export interface AddPartPayload {
  productId?: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number;
  source?: string;
  notes?: string;
}

export interface UpdateStatusPayload {
  toStatus: RepairStatus;
  note?: string;
}

export interface AddPaymentPayload {
  amount: number;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
}

// ─── API Methods ───────────────────────────────────────────

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const repairsApi = {
  list: (params?: {
    search?: string;
    status?: RepairStatus;
    priority?: RepairPriority;
    customerId?: string;
    technicianId?: string;
    shopId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get('/repair-tickets', { params }).then(unwrap) as Promise<{
      items: RepairTicket[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>,

  stats: () =>
    apiClient.get('/repair-tickets/stats').then(unwrap) as Promise<RepairStats>,

  getOne: (id: string) =>
    apiClient.get(`/repair-tickets/${id}`).then(unwrap) as Promise<RepairTicket>,

  create: (payload: CreateRepairTicketPayload) =>
    apiClient.post('/repair-tickets', payload).then(unwrap) as Promise<RepairTicket>,

  update: (id: string, payload: Partial<CreateRepairTicketPayload>) =>
    apiClient.patch(`/repair-tickets/${id}`, payload).then(unwrap) as Promise<RepairTicket>,

  diagnose: (id: string, payload: DiagnosePayload) =>
    apiClient.post(`/repair-tickets/${id}/diagnose`, payload).then(unwrap) as Promise<RepairTicket>,

  addPart: (id: string, payload: AddPartPayload) =>
    apiClient.post(`/repair-tickets/${id}/parts`, payload).then(unwrap) as Promise<RepairPart>,

  removePart: (id: string, partId: string) =>
    apiClient.delete(`/repair-tickets/${id}/parts/${partId}`).then(unwrap) as Promise<RepairTicket>,

  updateStatus: (id: string, payload: UpdateStatusPayload) =>
    apiClient.patch(`/repair-tickets/${id}/status`, payload).then(unwrap) as Promise<RepairTicket>,

  addPayment: (id: string, payload: AddPaymentPayload) =>
    apiClient.post(`/repair-tickets/${id}/payments`, payload).then(unwrap) as Promise<RepairPaymentRecord>,

  remove: (id: string) =>
    apiClient.delete(`/repair-tickets/${id}`).then(unwrap),
};
