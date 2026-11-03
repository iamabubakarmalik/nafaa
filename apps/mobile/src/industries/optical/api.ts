/**
 * Optical endpoints (same paths and shapes as apps/web/src/industries/optical/api):
 * prescriptions, eye tests, glasses and repair orders, optometrists, the
 * dashboard and the optical product profile. They need the server; screens
 * show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { LensOrderStatus, OpticalCategoryType, Power } from '@nafaa/core/industries/optical';

export type { LensOrderStatus, OpticalCategoryType, Power };
export type PayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

/* ───────────── prescriptions ───────────── */

export interface OpticalPrescription extends Power {
  id: string; prescriptionNumber: string; customerId?: string | null; customerName: string; customerPhone?: string | null;
  customerAge?: number | null; customerGender?: string | null; prescribedBy?: string | null; doctorName?: string | null; clinicName?: string | null;
  prescriptionDate: string; expiryDate?: string | null; prescriptionType?: string | null;
  rightVa?: string | null; leftVa?: string | null; segHeight?: number | null;
  clRightBaseCurve?: string | null; clLeftBaseCurve?: string | null; clRightDiameter?: string | null; clLeftDiameter?: string | null;
  notes?: string | null; isActive: boolean; timesUsed: number;
  computed?: { daysToExpiry: number | null; isExpired: boolean; isExpiringSoon: boolean };
  lensOrders?: Array<{ id: string; orderNumber: string; status: string; totalPrice: number; orderedAt: string; frameName: string; lensType: string }>;
  createdAt: string;
}
export type RxView = 'active' | 'expiring' | 'expired' | 'inactive' | 'all';
export interface RxPage { items: OpticalPrescription[]; total: number; page: number; limit: number; totalPages: number }
export interface RxSummary { total: number; active: number; expiringSoon: number; expired: number; thisMonth: number }
export type RxInput = Partial<Omit<OpticalPrescription, 'id' | 'prescriptionNumber' | 'computed' | 'lensOrders' | 'createdAt' | 'timesUsed'>>;
export interface RxQuery { view?: RxView; page?: number; limit?: number; search?: string; from?: string; to?: string; customerId?: string; type?: string }

export const prescriptionsApi = {
  create: (data: RxInput) => post<OpticalPrescription>('/optical/prescriptions', data),
  page: (params: RxQuery) => get<RxPage>('/optical/prescriptions/page', params),
  summary: () => get<RxSummary>('/optical/prescriptions/summary'),
  byCustomer: (customerId: string) => get<OpticalPrescription[]>(`/optical/prescriptions/by-customer/${customerId}`),
  getOne: (id: string) => get<OpticalPrescription>(`/optical/prescriptions/${id}`),
  update: (id: string, data: RxInput) => patch<OpticalPrescription>(`/optical/prescriptions/${id}`, data),
  renew: (id: string, overrides?: RxInput) => post<OpticalPrescription>(`/optical/prescriptions/${id}/renew`, overrides),
  deactivate: (id: string) => post<OpticalPrescription>(`/optical/prescriptions/${id}/deactivate`),
};

/* ───────────── eye tests ───────────── */

export type TestStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';

export interface OpticalEyeTest extends Power {
  id: string; testNumber: string; customerId?: string | null; customerName: string; customerPhone: string; customerAge?: number | null;
  appointmentDate: string; scheduledSlot?: string | null; optometristId?: string | null; optometristName?: string | null; status: TestStatus;
  chiefComplaint?: string | null; medicalHistory?: string | null; rightVa?: string | null; leftVa?: string | null;
  intraocularPressure?: string | null; colorVisionTest?: string | null; diagnosis?: string | null; recommendation?: string | null;
  requiresFollowUp: boolean; followUpDate?: string | null; followUpReason?: string | null; prescriptionIssued: boolean; prescriptionId?: string | null;
  testFee: number; paidAmount: number; paymentMethod?: string | null; isWaivedOff: boolean;
  testStartedAt?: string | null; testCompletedAt?: string | null; testDurationMinutes?: number | null; notes?: string | null;
  prescription?: OpticalPrescription | null;
}
export type EyeTestView = 'today' | 'upcoming' | 'waiting' | 'done' | 'unpaid' | 'followup' | 'closed' | 'all';
export interface EyeTestPage { items: OpticalEyeTest[]; total: number; page: number; limit: number; totalPages: number; totals: { fees: number; paid: number; due: number } }
export interface EyeTestSummary { scheduled: number; inProgress: number; completedToday: number; monthCount: number; pendingFollowUps: number; monthlyRevenue: number; monthlyBilled: number; unpaidCount: number; unpaidAmount: number }
export interface Slots { available: string[]; booked: Array<{ scheduledSlot: string | null; customerName: string }>; reason?: string; optometrist?: { consultationFee: number } }
export type EyeTestInput = Partial<Pick<OpticalEyeTest, 'customerId' | 'customerName' | 'customerPhone' | 'customerAge' | 'scheduledSlot' | 'optometristId' | 'chiefComplaint' | 'medicalHistory' | 'testFee' | 'notes'>> & { appointmentDate: string };
export type ResultsInput = Power & Partial<Pick<OpticalEyeTest, 'rightVa' | 'leftVa' | 'intraocularPressure' | 'colorVisionTest' | 'diagnosis' | 'recommendation' | 'requiresFollowUp' | 'followUpReason' | 'notes'>> & { followUpDate?: string; issuePrescription?: boolean };
export interface EyeTestQuery { view?: EyeTestView; page?: number; limit?: number; search?: string; from?: string; to?: string; optometristId?: string; customerId?: string }

export const eyeTestsApi = {
  create: (data: EyeTestInput) => post<OpticalEyeTest>('/optical/eye-tests', data),
  page: (params: EyeTestQuery) => get<EyeTestPage>('/optical/eye-tests/page', params),
  summary: () => get<EyeTestSummary>('/optical/eye-tests/summary'),
  availableSlots: (optometristId: string, date: string) => get<Slots>('/optical/eye-tests/available-slots', { optometristId, date }),
  bySales: (numbers: string[]) => get<Array<{ id: string; testNumber: string; notes: string | null }>>('/optical/eye-tests/by-sales', { numbers: numbers.join(',') }),
  getOne: (id: string) => get<OpticalEyeTest>(`/optical/eye-tests/${id}`),
  start: (id: string) => post<OpticalEyeTest>(`/optical/eye-tests/${id}/start`),
  recordResults: (id: string, data: ResultsInput) => post<OpticalEyeTest>(`/optical/eye-tests/${id}/results`, data),
  recordPayment: (id: string, data: { amount?: number; paymentMethod?: PayMethod; waiveOff?: boolean; onKhata?: boolean }) =>
    post<OpticalEyeTest & { sale?: { saleNumber: string } }>(`/optical/eye-tests/${id}/payment`, data),
  updateStatus: (id: string, data: { status: TestStatus; reason?: string; rescheduledDate?: string; scheduledSlot?: string }) =>
    patch<OpticalEyeTest>(`/optical/eye-tests/${id}/status`, data),
};

/* ───────────── glasses and repair orders ───────────── */

export interface OpticalLensOrder extends Power {
  id: string; orderNumber: string; customerId?: string | null; customerName: string; customerPhone: string; prescriptionId?: string | null;
  frameProductId?: string | null; frameName: string; lensType: string; lensMaterial?: string | null; lensIndex?: string | null; lensCoatings: string[];
  labName?: string | null; labOrderRef?: string | null; expectedDate?: string | null; orderedAt: string;
  receivedAt?: string | null; fittedAt?: string | null; deliveredAt?: string | null;
  framePrice: number; lensPrice: number; fittingCharge: number; totalPrice: number; paidAmount: number; remainingAmount: number;
  status: LensOrderStatus; qcNotes?: string | null; fittingNotes?: string | null; notes?: string | null;
}
export interface LensOrderDetail extends OpticalLensOrder {
  prescription: OpticalPrescription | null;
  booking: { id: string; bookingNumber: string; status: string; totalPaid: number; balanceDue: number; total: number } | null;
  sale: { id: string; saleNumber: string; status: string; total: number } | null;
  computed: { daysWaiting: number; isOverdue: boolean; isRepair: boolean };
}
export type LensOrderView = 'open' | 'lab' | 'ready' | 'late' | 'unpaid' | 'repairs' | 'delivered' | 'cancelled' | 'all';
export interface LensOrderPage { items: OpticalLensOrder[]; total: number; page: number; limit: number; totalPages: number; totals: { value: number; paid: number; due: number } }
export interface LensOrderSummary {
  ordered: number; atLab: number; received: number; ready: number; delivered: number; overdue: number; repairsOpen: number; dueToday: number;
  totalBilled: number; totalCollected: number; totalReceivable: number; monthlyOrders: number; monthlyValue: number;
}
export interface LabRow { labName: string; totalOrders: number; lensRevenue: number; avgTurnaroundDays: number; lateDeliveries: number; onTimePct: number }
export type LensOrderInput = Power & {
  customerId?: string; customerName: string; customerPhone: string; prescriptionId?: string;
  frameProductId?: string; frameName: string; lensType: string; lensMaterial?: string; lensIndex?: string; lensCoatings?: string[];
  labName?: string; labOrderRef?: string; expectedDate?: string;
  framePrice?: number; lensPrice?: number; lensCost?: number; fittingCharge?: number; paidAmount?: number; paymentMethod?: PayMethod; notes?: string;
};
export interface LensOrderQuery { view?: LensOrderView; page?: number; limit?: number; search?: string; from?: string; to?: string; customerId?: string }

export const lensOrdersApi = {
  create: (data: LensOrderInput) => post<OpticalLensOrder>('/optical/lens-orders', data),
  page: (params: LensOrderQuery) => get<LensOrderPage>('/optical/lens-orders/page', params),
  summary: () => get<LensOrderSummary>('/optical/lens-orders/summary'),
  labPerformance: () => get<LabRow[]>('/optical/lens-orders/lab-performance'),
  bySales: (ids: string[]) => get<Record<string, { id: string; number: string; repair: boolean; status: string }>>('/optical/lens-orders/by-sales', { ids: ids.join(',') }),
  getOne: (id: string) => get<LensOrderDetail>(`/optical/lens-orders/${id}`),
  sendToLab: (id: string, data: { labName: string; labOrderRef?: string; expectedDate?: string }) => post<OpticalLensOrder>(`/optical/lens-orders/${id}/send-to-lab`, data),
  /** CANCELLED cancels the order's booking; refundAdvance gives the advance back. */
  updateStatus: (id: string, data: { status: LensOrderStatus; qcNotes?: string; fittingNotes?: string; notes?: string; refundAdvance?: boolean; refundMethod?: PayMethod; managerPin?: string }) =>
    patch<OpticalLensOrder>(`/optical/lens-orders/${id}/status`, data),
  recordPayment: (id: string, data: { amount: number; paymentMethod?: PayMethod }) => post<OpticalLensOrder>(`/optical/lens-orders/${id}/payment`, data),
  deliver: (id: string, data: { fittingNotes?: string; payment?: number; paymentMethod?: PayMethod; onKhata?: boolean }) => post<OpticalLensOrder>(`/optical/lens-orders/${id}/deliver`, data),
};

/* ───────────── optometrists ───────────── */

export interface OpticalOptometrist {
  id: string; employeeCode: string; name: string; qualification?: string | null; registrationNumber?: string | null; phone: string; email?: string | null;
  specializations: string[]; yearsExperience?: number | null; workingDays: number[]; workStartTime: string; workEndTime: string;
  consultationFee: number; followUpFee: number; isActive: boolean; bio?: string | null; totalTests: number; totalRevenue: number;
}
export type OptometristInput = Partial<Omit<OpticalOptometrist, 'id' | 'totalTests' | 'totalRevenue'>>;

export const optometristsApi = {
  create: (data: OptometristInput) => post<OpticalOptometrist>('/optical/optometrists', data),
  list: (params?: { active?: boolean; availableToday?: boolean; search?: string }) => get<OpticalOptometrist[]>('/optical/optometrists', params),
  update: (id: string, data: OptometristInput) => patch<OpticalOptometrist>(`/optical/optometrists/${id}`, data),
  deactivate: (id: string) => del<OpticalOptometrist>(`/optical/optometrists/${id}`),
};

/* ───────────── dashboard ───────────── */

export interface ScheduledTest { id: string; customerName: string; customerPhone?: string; optometristName?: string; status: string; scheduledSlot?: string; appointmentDate: string }
export interface LensOrderRow { id: string; orderNumber: string; customerName: string; customerPhone?: string; frameName?: string; labName?: string; expectedDate?: string; remainingAmount?: number }
export interface ExpiringRx { id: string; prescriptionNumber: string; customerName: string; customerPhone?: string; expiryDate: string }
export interface OpticalOverview {
  totals?: { activePrescriptions: number; activeOptometrists: number };
  pending?: { todayAppointments: number; pendingTests: number; lensOrdersAtLab: number; lensOrdersReady: number; overdueLensOrders: number; expiringPrescriptions: number };
  today?: { testCount: number; testRevenue: number; lensOrderCount: number; lensRevenue: number; totalRevenue: number };
  monthly?: { totalReceivable: number };
  todaySchedule?: ScheduledTest[]; readyForPickup?: LensOrderRow[]; overdueList?: LensOrderRow[]; expiringList?: ExpiringRx[];
}

export const opticalDashboardApi = {
  overview: () => get<OpticalOverview>('/optical/dashboard/overview'),
};

/* ───────────── product profile ───────────── */

export type OpticalFrameShape = 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'OVAL' | 'CAT_EYE' | 'AVIATOR' | 'WAYFARER' | 'BROWLINE' | 'GEOMETRIC' | 'BUTTERFLY' | 'HEART' | 'OTHER';
export type OpticalFrameMaterial = 'ACETATE' | 'METAL' | 'TITANIUM' | 'STAINLESS_STEEL' | 'PLASTIC' | 'TR90' | 'WOOD' | 'ALUMINIUM' | 'MIXED' | 'OTHER';
export type OpticalGender = 'MENS' | 'WOMENS' | 'UNISEX' | 'KIDS' | 'KIDS_BOYS' | 'KIDS_GIRLS';

export interface OpticalFacts {
  productId: string; categoryType: OpticalCategoryType | null; brand: string | null; modelNumber: string | null; colorName: string | null; colorHex: string | null;
  frameShape: OpticalFrameShape | null; frameMaterial: OpticalFrameMaterial | null; gender: OpticalGender | null;
  frameSizeMm: number | null; bridgeSizeMm: number | null; templeLengthMm: number | null;
  lensType: string | null; lensIndex: string | null; lensCoatings: string[]; hasBlueCut: boolean; isPhotochromic: boolean; isPolarized: boolean;
  isContactLens: boolean; clDuration: string | null; clBaseCurve: string | null; clDiameter: string | null; clForAstigmatism: boolean;
  supportsMinSph: number | null; supportsMaxSph: number | null; supportsMaxCyl: number | null; supportsProgressive: boolean; warrantyMonths: number;
}
export interface OpticalProfileMore { collectionName?: string | null; lensMaterial?: string | null; clWaterContent?: string | null; hasUvProtection?: boolean; notes?: string | null }
export type OpticalProfile = (OpticalFacts & OpticalProfileMore & { id: string }) | null;

export const opticalProductsApi = {
  upsert: (data: Record<string, unknown>) => post<OpticalFacts>('/optical/products', data),
  facts: () => get<OpticalFacts[]>('/optical/products/facts'),
  byProduct: (productId: string) => get<OpticalProfile>(`/optical/products/by-product/${productId}`),
};
