/**
 * Organization API (same endpoints and shapes as the web): branches, team
 * logins, counter rules, the owner PIN and security. Everything here needs
 * the server (settings, team and PIN changes are online-only).
 */

import { apiClient } from '@/core/api/client';

const unwrap = <T>(res: { data: { data?: T } & T }): T => (res.data?.data !== undefined ? (res.data.data as T) : (res.data as T));

/* ── Branches ── */

export type ShopType = 'SHOP' | 'WAREHOUSE' | 'GODOWN';

export interface Shop {
  id: string; name: string; address?: string | null; phone?: string | null;
  isMain: boolean; isActive: boolean; type: ShopType; createdAt: string;
  _count?: { users?: number; sales?: number; shopStocks?: number; cashRegisters?: number };
}

export interface ShopAnalyticsRow extends Shop {
  todaySales: number; todayProfit: number; todayOrders: number; monthSales: number; monthProfit: number; monthOrders: number;
  lowStockCount: number; totalStock: number; stockValue?: number; stockRetailValue: number;
  registerOpen: boolean; openDrawers: number; registerBalance: number; registerOpenedAt: string | null;
  yesterdaySales: number; growthVsYesterday: number; weekSales: number; avgOrderValue: number;
  todayNetProfit: number; monthNetProfit: number; outstandingCredit: number;
  staffCount: number; staffOnDuty: number; onDutyNames: string[]; monthShare: number; rank: number;
}

export interface ShopAnalytics {
  shops: ShopAnalyticsRow[];
  totals: {
    todaySales: number; todayOrders: number; todayNetProfit: number; todayExpenses: number; monthSales: number; monthNetProfit: number;
    outstandingCredit: number; lowStockCount: number; totalStock: number; stockValue?: number; registersOpen: number; drawerCash: number;
    staffCount: number; staffOnDuty: number; shopCount: number;
  };
  best: ShopAnalyticsRow | null;
  costHidden: boolean;
  day: string;
  needsAttention: Array<{ shopId: string; name: string; reasons: string[] }>;
}

export interface BranchFigures {
  id: string; name: string; type: ShopType; isMain: boolean; bills: number; gross: number; refunds: number; net: number;
  discount: number; cashIn: number; credit: number; cost?: number; grossProfit?: number; expenses: number; writeOff: number;
  netProfit?: number; margin?: number; avgBill: number; share: number;
  prev: { bills: number; net: number; netProfit: number }; growth: number;
}

export interface BranchComparison {
  range: { from: string; to: string; days: number };
  costHidden: boolean;
  shops: BranchFigures[];
  totals: { bills: number; gross: number; net: number; expenses: number; netProfit?: number; prevNet: number; credit: number; cashIn: number };
}

export interface CreateShopPayload {
  name: string; address?: string; phone?: string; isMain?: boolean; type?: ShopType;
  managerName?: string; managerEmail?: string; managerPhone?: string; managerPassword?: string;
}
export interface UpdateShopPayload { name?: string; address?: string; phone?: string; isMain?: boolean; type?: ShopType; isActive?: boolean }

export interface ShopDeleteError {
  message: string;
  code: 'MAIN_SHOP_PROTECTED' | 'HAS_FINANCIAL_HISTORY' | 'HAS_SALES_HISTORY' | 'HAS_PENDING_TRANSFERS' | 'HAS_OPEN_REGISTER';
  suggestion?: string;
}

export const shopsApi = {
  list: () => apiClient.get('/shops').then(unwrap<Shop[]>),
  analytics: () => apiClient.get('/shops/analytics').then(unwrap<ShopAnalytics>),
  compare: (p: { from: string; to: string }) => apiClient.get('/shops/compare', { params: p }).then(unwrap<BranchComparison>),
  get: (id: string) => apiClient.get(`/shops/${id}`).then(unwrap<Shop>),
  create: (payload: CreateShopPayload) => apiClient.post('/shops', payload).then(unwrap<Shop & { manager?: { id: string; fullName: string; email: string } | null }>),
  update: (id: string, payload: UpdateShopPayload) => apiClient.patch(`/shops/${id}`, payload).then(unwrap<Shop>),
  toggleActive: (id: string) => apiClient.patch(`/shops/${id}/toggle`).then(unwrap<Shop>),
  remove: (id: string) => apiClient.delete(`/shops/${id}`).then(unwrap<{ message: string }>),
};

/* ── Team ── */

export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';
export type AssignableRole = 'MANAGER' | 'CASHIER' | 'STAFF';

export interface TeamMember {
  id: string; fullName: string; email: string; phone?: string | null; role: UserRole; isActive: boolean;
  permissions?: string[]; shopId?: string | null; assignedShop?: { id: string; name: string; isMain: boolean } | null;
  lastLoginAt?: string | null; createdAt: string; hasApprovalPin?: boolean;
}

export interface InvitePayload {
  fullName: string; email: string; phone?: string; password: string; role: AssignableRole;
  shopId?: string; permissions: string[]; sendEmail?: boolean;
}

export interface UpdateLoginPayload { fullName?: string; email?: string; phone?: string; role?: UserRole; shopId?: string | null }

export const teamApi = {
  list: () => apiClient.get('/team').then(unwrap<TeamMember[]>),
  catalog: () => apiClient.get('/team/permissions/catalog').then(unwrap<{ allPermissions: string[]; defaultsByRole: Record<string, string[]> }>),
  /** Creates the login with the chosen role and permission list (a preset only fills the list). */
  invite: (p: InvitePayload) => apiClient.post('/team/invite', p).then(unwrap<{ id: string; fullName: string; email: string; role: UserRole; emailSent: boolean }>),
  updateLogin: (id: string, p: UpdateLoginPayload) => apiClient.patch(`/team/${id}`, p).then(unwrap<unknown>),
  updatePermissions: (id: string, permissions: string[]) => apiClient.patch(`/team/${id}/permissions`, { permissions }).then(unwrap<TeamMember>),
  updateShop: (id: string, shopId: string | null) => apiClient.patch(`/team/${id}/shop`, { shopId }).then(unwrap<TeamMember>),
  setActive: (id: string, isActive: boolean) => apiClient.patch(`/team/${id}/toggle`, { isActive }).then(unwrap<{ id: string; isActive: boolean }>),
  resetPassword: (id: string, password: string) => apiClient.post(`/team/${id}/reset-password`, { password }).then(unwrap<{ ok: boolean; sessionsClosed: number }>),
  setApprovalPin: (id: string, pin: string) => apiClient.post(`/team/${id}/approval-pin`, { pin }).then(unwrap<{ id: string; hasApprovalPin: boolean }>),
  clearApprovalPin: (id: string) => apiClient.delete(`/team/${id}/approval-pin`).then(unwrap<{ id: string; hasApprovalPin: boolean }>),
  signOut: (id: string) => apiClient.delete(`/team/${id}/sessions`).then(unwrap<{ ok: boolean; sessionsClosed: number }>),
  remove: (id: string) => apiClient.delete(`/team/${id}`).then(unwrap<{ message: string }>),
};

/* ── Counter rules and security ── */

export interface CounterRules {
  defaultPaymentMethod: string;
  requireCustomerForSale: boolean;
  allowDiscount: boolean;
  maxDiscountPercent: number;
  requirePinForVoid: boolean;
  requirePinForDiscount: boolean;
  requirePinForRefund: boolean;
  hasManagerPin: boolean;
  serviceChargePct: number;
  exchangeDays: number;
  posCounter?: Record<string, unknown>;
}

export type CounterRulePatch = Partial<Omit<CounterRules, 'hasManagerPin' | 'posCounter'>>;

export interface PinStatus {
  hasPin: boolean; pinUpdatedAt: string | null; lockedRoutes: string[]; unlockMinutes: number; hideCostByDefault: boolean; canManage: boolean;
}

export interface SecurityScore {
  score: number; level: 'STRONG' | 'MEDIUM' | 'WEAK';
  checks: Array<{ key: string; label: string; done: boolean; weight: number }>;
  activeSessions: number; recommendations: string[];
}

export interface TenantSession {
  id: string; deviceName?: string | null; location?: string | null; ipAddress?: string | null; lastActiveAt?: string | null; user?: { fullName?: string };
}

export const settingsApi = {
  counter: () => apiClient.get('/settings/counter').then(unwrap<CounterRules | null>),
  /** Owner settings (PATCH /settings): the same call the web counter rules use. */
  update: (data: CounterRulePatch) => apiClient.patch('/settings', data).then(unwrap<unknown>),
  updatePosCounter: (data: Record<string, unknown>) => apiClient.patch('/settings/pos-counter', data).then(unwrap<Record<string, unknown>>),
};

export const securityApi = {
  status: () => apiClient.get('/settings/security/pin-status').then(unwrap<PinStatus>),
  setPin: (pin: string, currentPin?: string) => apiClient.post('/settings/security/set-pin', { pin, ...(currentPin ? { currentPin } : {}) }).then(unwrap<{ success: boolean }>),
  resetPin: (password: string, newPin: string) => apiClient.post('/settings/security/reset-pin', { password, newPin }).then(unwrap<{ success: boolean }>),
  removePin: (body: { currentPin?: string; password?: string }) => apiClient.post('/settings/security/remove-pin', body).then(unwrap<{ success: boolean }>),
  setLockedRoutes: (routes: string[]) => apiClient.patch('/settings/security/locked-routes', { routes }).then(unwrap<{ lockedRoutes: string[] }>),
  updatePrefs: (body: { unlockMinutes?: number; hideCostByDefault?: boolean }) => apiClient.patch('/settings/security/pin-prefs', body).then(unwrap<{ success: boolean }>),
  score: () => apiClient.get('/settings/security/score').then(unwrap<SecurityScore>),
  sessions: () => apiClient.get('/settings/security/sessions').then(unwrap<TenantSession[]>),
  revokeSession: (id: string) => apiClient.delete(`/settings/security/sessions/${id}`).then(unwrap<unknown>),
  changePassword: (currentPassword: string, newPassword: string) => apiClient.post('/auth/change-password', { currentPassword, newPassword }).then(unwrap<unknown>),
  setPassword: (newPassword: string) => apiClient.post('/auth/set-password', { newPassword }).then(unwrap<unknown>),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }).then(unwrap<unknown>),
};
