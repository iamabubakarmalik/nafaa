import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

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
  RECEIVED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  DIAGNOSED: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  AWAITING_APPROVAL: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  AWAITING_PARTS: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  IN_PROGRESS: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  READY: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  DELIVERED: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  UNREPAIRABLE: { bg: '#fecaca', text: '#991b1b', border: '#f87171' },
};

export const REPAIR_PRIORITY_LABELS: Record<RepairPriority, string> = {
  NORMAL: 'Normal',
  URGENT: 'Urgent',
  EMERGENCY: 'Emergency',
};

export const REPAIR_PRIORITY_COLORS: Record<RepairPriority, { bg: string; text: string; border: string }> = {
  NORMAL: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
  URGENT: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  EMERGENCY: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
};

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

const unwrap = <T = any>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data) as T;

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
  }): Promise<{ items: RepairTicket[]; total: number; page: number; limit: number; totalPages: number }> =>
    apiClient.get('/repair-tickets', { params }).then(unwrap) as any,

  stats: (): Promise<RepairStats> =>
    apiClient.get('/repair-tickets/stats').then(unwrap) as any,

  getOne: (id: string): Promise<RepairTicket> =>
    apiClient.get(`/repair-tickets/${id}`).then(unwrap) as any,

  create: (payload: CreateRepairTicketPayload): Promise<RepairTicket> =>
    apiClient.post('/repair-tickets', payload).then(unwrap) as any,

  update: (id: string, payload: Partial<CreateRepairTicketPayload>): Promise<RepairTicket> =>
    apiClient.patch(`/repair-tickets/${id}`, payload).then(unwrap) as any,

  diagnose: (id: string, payload: DiagnosePayload): Promise<RepairTicket> =>
    apiClient.post(`/repair-tickets/${id}/diagnose`, payload).then(unwrap) as any,

  addPart: (id: string, payload: AddPartPayload): Promise<RepairPart> =>
    apiClient.post(`/repair-tickets/${id}/parts`, payload).then(unwrap) as any,

  removePart: (id: string, partId: string): Promise<RepairTicket> =>
    apiClient.delete(`/repair-tickets/${id}/parts/${partId}`).then(unwrap) as any,

  updateStatus: (id: string, payload: UpdateStatusPayload): Promise<RepairTicket> =>
    apiClient.patch(`/repair-tickets/${id}/status`, payload).then(unwrap) as any,

  addPayment: (id: string, payload: AddPaymentPayload): Promise<RepairPaymentRecord> =>
    apiClient.post(`/repair-tickets/${id}/payments`, payload).then(unwrap) as any,

  remove: (id: string): Promise<any> =>
    apiClient.delete(`/repair-tickets/${id}`).then(unwrap) as any,
};
