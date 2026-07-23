export interface MarketplaceShop {
  id: string;
  name: string;
  slug: string;
  industry: string;
  logoUrl?: string;
  coverUrl?: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  distance?: number;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  hoursToday?: { open: string; close: string };
  deliveryAvailable: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
  estimatedDeliveryMinutes?: number;
}
