import { apiClient } from '@/api/client';
import type { BakeryCategory, BakerySize, CakeShape, CakeFlavor, CreamType } from './products.api';

export type BakeryOrderStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'DEPOSIT_PAID' | 'IN_PRODUCTION'
  | 'BAKING' | 'DECORATING' | 'QUALITY_CHECK' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'REFUNDED';

export type DeliveryType = 'SELF_PICKUP' | 'HOME_DELIVERY' | 'VENUE_DELIVERY' | 'COURIER';

export interface CakeOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  productId?: string;
  productName?: string;
  category: BakeryCategory;
  size: BakerySize;
  customWeightKg?: number;
  shape: CakeShape;
  customShapeDesc?: string;
  flavor: CakeFlavor;
  customFlavorDesc?: string;
  creamType?: CreamType;
  numberOrLetter?: string;
  numberOfTiers: number;
  tierDetails?: any;
  messageOnCake?: string;
  messageColor?: string;
  hasPhotoOnCake: boolean;
  photoUrl?: string;
  hasEdibleImage: boolean;
  designReferenceUrls: string[];
  designInstructions?: string;
  colorTheme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  decorativeItems: string[];
  candlesRequired?: number;
  candleType?: string;
  cakeStand: boolean;
  cakeKnife: boolean;
  occasion: string;
  celebrantName?: string;
  celebrantAge?: number;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  isEggless: boolean;
  isSugarFree: boolean;
  isVegan: boolean;
  allergies: string[];
  dietaryNotes?: string;
  deliveryType: DeliveryType;
  neededBy: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryCharges: number;
  status: BakeryOrderStatus;
  productionStatus?: string;
  assignedBakerId?: string;
  assignedDecoratorId?: string;
  basePrice: number;
  customizationCharges: number;
  photoCakeCharges: number;
  taxAmount: number;
  discount: number;
  advanceRequired: number;
  advancePaid: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  customerRating?: number;
  customerFeedback?: string;
  finalPhotoUrls: string[];
  specialInstructions?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cakeOrdersApi = {
  create: (data: any) => apiClient.post('/bakery/cake-orders', data).then(unwrap<CakeOrder>),
  list: (params?: any) => apiClient.get('/bakery/cake-orders', { params }).then(unwrap<CakeOrder[]>),
  upcoming: (days?: number) => apiClient.get('/bakery/cake-orders/upcoming', { params: { days } }).then(unwrap<CakeOrder[]>),
  calendar: (from: string, to: string) => apiClient.get('/bakery/cake-orders/calendar', { params: { from, to } }).then(unwrap<CakeOrder[]>),
  getOne: (id: string) => apiClient.get('/bakery/cake-orders/' + id).then(unwrap<CakeOrder>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/bakery/cake-orders/' + id + '/status', { status, cancellationReason }).then(unwrap<CakeOrder>),
  addPayment: (id: string, amount: number) => apiClient.post('/bakery/cake-orders/' + id + '/payment', { amount }).then(unwrap<CakeOrder>),
  assign: (id: string, bakerId: string, decoratorId?: string) =>
    apiClient.post('/bakery/cake-orders/' + id + '/assign', { bakerId, decoratorId }).then(unwrap<CakeOrder>),
  rate: (id: string, rating: number, feedback?: string, photoUrls?: string[]) =>
    apiClient.post('/bakery/cake-orders/' + id + '/rating', { rating, feedback, photoUrls }).then(unwrap<CakeOrder>),
};
