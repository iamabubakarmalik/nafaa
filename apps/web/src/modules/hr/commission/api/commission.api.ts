import { apiClient } from '@core/api/client';

/* ═════════════════════════════════════════════════════════════
   COMMISSION — server se
   ─────────────────────────────────────────────────────────────
   Hisab server par banta hai, yahan sirf laaya jata hai. Is ka
   matlab: rules har machine par ek jaise hain, aur bill void ho
   ya wapsi ho to commission apne aap theek ho jati hai.
   ═════════════════════════════════════════════════════════════ */

export type CommissionBasis = 'SALE' | 'PROFIT' | 'PER_BILL';
export type CommissionValueType = 'PERCENT' | 'FIXED';

export const BASIS_META: Record<CommissionBasis, {
  label: string; emoji: string; hint: string;
}> = {
  SALE: {
    label: 'Bikri par', emoji: '💵',
    hint: 'Jitna becha us par — aam tareeqa, samajhne me aasan',
  },
  PROFIT: {
    label: 'Munafa par', emoji: '📈',
    hint: 'Jo bacha us par — banda chhoot kam deta hai',
  },
  PER_BILL: {
    label: 'Har bill par', emoji: '🧾',
    hint: 'Har bill ka fixed paisa — chhoti raqam, zyada bill',
  },
};

export interface CommissionRule {
  id: string;
  name?: string | null;
  userId?: string | null;
  basis: CommissionBasis;
  valueType: CommissionValueType;
  value: number;
  categoryIds: string[];
  minMonthlySale?: number | null;
  targetAmount?: number | null;
  targetBonus?: number | null;
  isActive: boolean;
  note?: string | null;
  user?: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface CommissionLine {
  ruleId: string;
  label: string;
  base: number;
  rate: number;
  valueType: CommissionValueType;
  amount: number;
}

export interface CommissionRow {
  userId: string;
  name: string;
  enrolled: boolean;
  staff?: {
    id: string; staffNumber?: string; designation?: string;
    salaryType?: string; baseSalary?: number; status?: string;
  } | null;
  /** Mahine ki pakki tankhwah — sirf COMMISSION wale ki 0 hoti hai */
  baseSalary: number;
  /** Tankhwah + commission — "is mahine kitna milega" ka jawab */
  totalPay: number;
  bills: number;
  sale: number;
  profit: number;
  earned: number;
  bonus: number;
  blockedByMin?: { need: number; short: number };
  targetPct?: number;
  paid: boolean;
  paidAt?: string | null;
  paidAmount?: number | null;
  lines: CommissionLine[];
}

export interface CommissionSummary {
  period: string;
  timezone: string;
  /** Karobari din kis ghante shuru hota hai (0–23) */
  dayStartHour: number;
  /** `own` = sirf apni commission dikhti hai, `all` = sab ki */
  scope: 'own' | 'all';
  from: string;
  to: string;
  rows: CommissionRow[];
  total: number;
  paidTotal: number;
  pendingTotal: number;
  enabledCount: number;
  notEnrolled: Array<{ userId: string; name: string; bills: number; sale: number }>;
  partialReturnCount: number;
  orphanBills: number;
  orphanSale: number;
  /** Jin bill par cashier koi aur tha magar bikri kisi aur ke naam lagi */
  reassignedBills: number;
  baseTotal: number;
  payTotal: number;
  ruleCount: number;
}

export interface CommissionDetail extends CommissionRow {
  period: string;
  timezone: string;
  byProduct: Array<{
    productId: string; name: string; unit: string;
    categoryId?: string | null; categoryName?: string | null;
    qty: number; sale: number; cost: number; profit: number;
    returned: number; bills: number; commission: number;
  }>;
  byCategory: Array<{
    categoryId?: string | null; name: string;
    qty: number; sale: number; commission: number; items: number;
  }>;
  billList: Array<{
    id: string; saleNumber: string; soldAt: string; status: string;
    customer?: string | null; total: number; profit: number;
    discount: number; items: number;
  }>;
}

export interface CommissionPerson {
  userId: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  /** false = is employee ka apna login nahi, bikri us ke naam darj nahi hogi */
  canSell: boolean;
  staff?: {
    id: string; staffNumber?: string; designation?: string;
    salaryType?: string; baseSalary?: number; status?: string;
    avatarUrl?: string | null; linkedByGuess?: boolean;
  } | null;
  enrolled: boolean;
  since?: string | null;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const commissionApi = {
  listRules: () =>
    apiClient.get('/commission/rules').then(unwrap<CommissionRule[]>),

  createRule: (data: any) =>
    apiClient.post('/commission/rules', data).then(unwrap<CommissionRule>),

  updateRule: (id: string, data: any) =>
    apiClient.patch(`/commission/rules/${id}`, data).then(unwrap<CommissionRule>),

  removeRule: (id: string) =>
    apiClient.delete(`/commission/rules/${id}`).then(unwrap),

  people: () =>
    apiClient.get('/commission/people')
      .then(unwrap<{ people: CommissionPerson[]; withoutLogin: CommissionPerson[] }>),

  enroll: (data: { userId: string; isActive: boolean; staffId?: string; note?: string }) =>
    apiClient.post('/commission/enroll', data).then(unwrap),

  summary: (period: string) =>
    apiClient.get('/commission/summary', { params: { period } }).then(unwrap<CommissionSummary>),

  detail: (userId: string, period: string) =>
    apiClient.get(`/commission/detail/${userId}`, { params: { period } })
      .then(unwrap<CommissionDetail>),

  pay: (data: { userId: string; period: string; amount: number; note?: string }) =>
    apiClient.post('/commission/pay', data).then(unwrap),

  undoPay: (userId: string, period: string) =>
    apiClient.delete(`/commission/pay/${userId}`, { params: { period } }).then(unwrap),
};
