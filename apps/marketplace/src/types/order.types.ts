import type { CustomerAddress } from './customer.types';

export type MarketplaceOrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PREPARING'
  | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'REFUNDED';

export interface MarketplaceOrder {
  id: string;
  orderNumber: string;
  shopId: string;
  shopName: string;
  status: MarketplaceOrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryAddress: CustomerAddress;
  paymentMethod: string;
  createdAt: string;
  estimatedDeliveryAt?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  quantity: number;
  price: number;
  total: number;
  imageUrl?: string;
}
