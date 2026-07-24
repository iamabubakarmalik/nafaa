import { marketplaceClient, unwrap } from '@/api/client';
import type { PaymentMethod } from '@/types';

export interface PreviewCheckoutParams {
  addressId?: string;
  deliveryType?: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  couponCode?: string;
  loyaltyPointsToUse?: number;
  walletAmountToUse?: number;
  paymentMethod?: PaymentMethod;
}

export interface PlaceOrderPayload {
  addressId: string;
  deliveryType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  paymentMethod: PaymentMethod;
  savedCardId?: string;
  couponCode?: string;
  loyaltyPointsToUse?: number;
  walletAmountToUse?: number;
  customerNotes?: string;
  deliverySlotStart?: string;
  deliverySlotEnd?: string;
  tipAmount?: number;
}

export interface CheckoutPreview {
  shopBreakdown: Array<{
    shopId: string;
    shop: any;
    itemCount: number;
    subtotal: number;
    deliveryFee: number;
    minOrderAmount: number;
    meetsMinOrder: boolean;
    total: number;
  }>;
  subtotal: number;
  totalDeliveryFee: number;
  couponDiscount: number;
  couponError?: string | null;
  loyaltyPoints: {
    available: number;
    used: number;
    maxValue: number;
    appliedDiscount: number;
  };
  wallet: {
    balance: number;
    used: number;
    remainingAfter: number;
  };
  totalDiscount: number;
  grandTotalBeforeWallet: number;
  finalTotal: number;
  canPlaceOrder: boolean;
  warnings: string[];
}

export interface DeliverySlot {
  start: string;
  end: string;
  label: string;
}

export const checkoutApi = {
  preview: (params: PreviewCheckoutParams) =>
    marketplaceClient.post('/checkout/preview', params).then(unwrap<CheckoutPreview>),

  placeOrder: (payload: PlaceOrderPayload) =>
    marketplaceClient.post('/checkout/place-order', payload).then(unwrap<{
      success: boolean;
      orders: Array<{
        id: string;
        orderNumber: string;
        shopId: string;
        total: number;
        paymentMethod: PaymentMethod;
        status: string;
      }>;
      totalOrders: number;
      grandTotal: number;
    }>),

  slots: (shopId?: string) =>
    marketplaceClient.get('/checkout/delivery-slots', { params: { shopId } }).then(unwrap<{
      slots: DeliverySlot[];
    }>),
};
