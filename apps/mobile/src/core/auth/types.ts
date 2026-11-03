export type Role = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  tenantId?: string;
  permissions?: string[];
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  avatarUrl?: string | null;
  shopId?: string | null;
  assignedShop?: { id: string; name: string; isMain: boolean; type?: string; isActive?: boolean } | null;
  hasPassword?: boolean;
  googleId?: string | null;
  authProvider?: 'EMAIL' | 'GOOGLE' | 'HYBRID' | 'APPLE';
  appleId?: string | null;
  /** 'en' | 'ur' | 'roman'; null until the first choice is saved. */
  language?: string | null;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency?: string;
  language?: string;
  businessType?: string | null;
  businessFeatures?: Record<string, boolean> | null;
  defaultUnit?: string | null;
  /** RETAIL, WHOLESALE, DISTRIBUTION, ONLINE; empty = not answered (retail). */
  businessModels?: string[] | null;
}

export interface AuthSession {
  user: AuthUser;
  tenant: AuthTenant;
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthSession {
  isNewUser?: boolean;
  isNewDevice?: boolean;
  requiresEmailVerification?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isMain: boolean;
  isActive: boolean;
  type: 'SHOP' | 'WAREHOUSE' | 'GODOWN' | string;
}
