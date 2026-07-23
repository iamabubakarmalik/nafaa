export interface MarketplaceCustomer {
  id: string;
  phone: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
  loyaltyPoints: number;
  walletBalance: number;
  referralCode: string;
  language: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  area: string;
  province?: string | null;
  postalCode?: string | null;
  isDefault: boolean;
  addressType: 'HOME' | 'OFFICE' | 'OTHER';
  lat?: number | null;
  lng?: number | null;
  deliveryNotes?: string | null;
}
