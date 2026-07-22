export interface MarketplaceCustomer {
  id: string;
  phone: string;
  email?: string;
  fullName: string;
  avatarUrl?: string;
  defaultAddress?: CustomerAddress;
  loyaltyPoints: number;
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  area: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}
