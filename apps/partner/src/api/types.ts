/**
 * Shapes returned by the partner API (apps/api/src/modules/partners/portal).
 * Dates arrive as ISO strings.
 */

export type PartnerType = 'REFERRAL' | 'FIELD_AGENT' | 'RESELLER' | 'TRAINER' | 'EMPLOYEE';
export type PartnerStatus = 'APPLIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type LeadStage = 'VISITED' | 'DEMO' | 'SIGNED_UP' | 'ACTIVATED' | 'PAID' | 'LOST';
export type Interest = 'HOT' | 'WARM' | 'COLD';
export type EarningKind = 'SIGNUP_BONUS' | 'ACTIVATION_BONUS' | 'RECURRING' | 'OVERRIDE' | 'SLAB_BONUS' | 'ADJUSTMENT';
export type EarningStatus = 'PENDING' | 'PAYABLE' | 'PAID' | 'REVERSED';
export type PayoutStatus = 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';
export type PayoutMethod = 'JAZZCASH' | 'EASYPAISA' | 'BANK';

export interface Me {
  id: string;
  code: string;
  type: PartnerType;
  status: PartnerStatus;
  fullName: string;
  phone: string;
  email: string | null;
  cnic: string | null;
  city: string | null;
  territory: string | null;
  isManager: boolean;
  incentivesOn: boolean;
  salary: number | null;
  payoutMethod: PayoutMethod | null;
  payoutAccount: string | null;
  payoutTitle: string | null;
  bankName: string | null;
  rejectReason: string | null;
  manager: { fullName: string; phone: string } | null;
  appliedAt: string;
  approvedAt: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  partner: Me;
}

export interface Balances {
  pending: number;
  available: number;
  requested: number;
  paid: number;
  reversed: number;
  minPayout: number;
}

export interface Slab { signups: number; bonus: number }

export interface Plan {
  name: string;
  signupBonus: number;
  activationBonus: number;
  activationSales: number;
  activationDays: number;
  recurringPercent: number;
  recurringMonths: number;
  managerOverridePercent: number;
  clawbackDays: number;
  slabs: Slab[];
}

export interface FollowUp {
  id: string;
  shopName: string;
  ownerName: string | null;
  phone: string;
  followUpAt: string | null;
  stage: LeadStage;
  interest: string | null;
}

export interface LeaderRow {
  rank: number;
  name: string;
  city: string | null;
  me: boolean;
  paid: number;
  signups: number;
}

export interface Dashboard {
  month: string;
  today: { visits: number };
  thisMonth: { visits: number; signups: number; activations: number; paid: number };
  leads: Record<LeadStage, number>;
  earnings: Balances;
  target: { visits: number; signups: number; activations: number } | null;
  nextSlab: Slab | null;
  plan: Plan | null;
  followUps: FollowUp[];
  leaderboard: { top: LeaderRow[]; myRank: number | null; total: number };
}

export interface Visit {
  id: string;
  visitedAt: string;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  note: string | null;
  flags: string[] | null;
}

export interface Lead {
  id: string;
  partnerId: string;
  shopName: string;
  ownerName: string | null;
  phone: string;
  category: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  interest: string | null;
  stage: LeadStage;
  lostReason: string | null;
  followUpAt: string | null;
  notes: string | null;
  lockedUntil: string;
  signedUpAt: string | null;
  activatedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  signedUp: boolean;
  planName: string | null;
  locked: boolean;
  visitCount?: number;
  lastVisitAt?: string | null;
  visits?: Visit[];
}

export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface Paged<T> { items: T[]; meta: PageMeta }

export interface LeadInput {
  shopName?: string;
  ownerName?: string;
  phone?: string;
  category?: string;
  city?: string;
  address?: string;
  interest?: string;
  followUpAt?: string | null;
  notes?: string;
  stage?: LeadStage;
  lostReason?: string;
}

export interface VisitInput {
  clientId: string;
  leadId?: string;
  lead?: LeadInput;
  lat?: number;
  lng?: number;
  accuracy?: number;
  photoUrl?: string;
  note?: string;
  visitedAt?: string;
  interest?: string;
  followUpAt?: string | null;
  stage?: 'DEMO';
}

export interface VisitResult { visitId: string; flags?: string[]; lead: Lead; duplicate?: boolean }

export interface Earning {
  id: string;
  kind: EarningKind;
  status: EarningStatus;
  amount: number;
  description: string | null;
  availableAt: string | null;
  reversedReason: string | null;
  payoutId: string | null;
  createdAt: string;
}

export interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  method: string | null;
  account: string | null;
  accountTitle: string | null;
  reference: string | null;
  rejectReason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  paidAt: string | null;
}

export interface Statement {
  month: string;
  partner: { name: string; code: string; phone: string; cnic: string | null; city: string | null };
  earnings: Array<{ kind: EarningKind; status: EarningStatus; amount: number; description: string | null; createdAt: string }>;
  payouts: Array<{ amount: number; reference: string | null; method: string | null; paidAt: string | null }>;
  totals: { earned: number; paid: number };
}

export interface KitItem {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  thumbnail?: string;
}

export interface Kit {
  items: KitItem[];
  demo: { url?: string; login?: string; email?: string; phone?: string; password?: string; note?: string } | null;
}

export interface TeamMember {
  id: string;
  fullName: string;
  phone: string;
  city: string | null;
  type: PartnerType;
  status: PartnerStatus;
  lastSeenAt: string | null;
  visits: number;
  signups: number;
  paid: number;
}

export interface Presign { uploadUrl: string; publicUrl: string; headers?: Record<string, string> }
