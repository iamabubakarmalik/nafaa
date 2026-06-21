import { apiClient } from './client';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'JAZZCASH'
  | 'EASYPAISA';

export interface CreateSaleItem {
  productId: string;
  variantId?: string;
  imeiId?: string;
  quantity: number;
  priceOverride?: number;
  lineDiscount?: number;
  useWholesale?: boolean;
  note?: string;
}

export interface CreateSalePayload {
  shopId: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discount?: number;
  discountCode?: string;
  loyaltyPointsToUse?: number;
  note?: string;
  items: CreateSaleItem[];
}

export interface Sale {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  creditAmount: number;
  costOfGoods: number;
  paymentMethod: PaymentMethod;
  soldAt: string;
  status?: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' | 'VOIDED';
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    balance?: number;
    address?: string | null;
    email?: string | null;
  } | null;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  shop?: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    isMain?: boolean;
  } | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    phone?: string | null;
    country: string;
    currency: string;
    settings?: {
      shopName?: string | null;
      legalName?: string | null;
      shopAddress?: string | null;
      shopCity?: string | null;
      shopProvince?: string | null;
      shopPhone?: string | null;
      shopWhatsapp?: string | null;
      shopEmail?: string | null;
      shopWebsite?: string | null;
      logoUrl?: string | null;
      taxNumber?: string | null;
      taxLabel?: string | null;
      enableTax?: boolean;
      receiptSize?: string;
      receiptHeader?: string | null;
      receiptFooter?: string | null;
      receiptShowLogo?: boolean;
      receiptShowTax?: boolean;
      receiptShowCustomer?: boolean;
      receiptShowBarcode?: boolean;
      receiptShowQrCode?: boolean;
      currencySymbol?: string;
      currency?: string;
    } | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    costPrice: number;
    total: number;
    note?: string | null;
    product: {
      id: string;
      name: string;
      unit: string;
      sku?: string | null;
      barcode?: string | null;
    };
    variantLink?: {
      variant: {
        id: string;
        name: string;
        sku?: string | null;
        color?: string | null;
        colorHex?: string | null;
        size?: string | null;
        imageUrl?: string | null;
      };
    } | null;
  }>;
}

export interface SalesSummary {
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
  todayCredit: number;
  todayPaid: number;
  monthSales: number;
  monthProfit: number;
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
  paymentBreakdown: Array<{
    paymentMethod: PaymentMethod;
    _count: { _all: number };
    _sum: { total: number | null };
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const salesApi = {
  create: (payload: CreateSalePayload) =>
    apiClient.post<{ data: Sale }>('/sales', payload).then(unwrap),

  list: (shopId?: string) =>
    apiClient.get<{ data: Sale[] }>('/sales', { params: shopId ? { shopId } : {} }).then(unwrap),

  summary: (shopId?: string) =>
    apiClient.get<{ data: SalesSummary }>('/sales/summary', { params: shopId ? { shopId } : {} }).then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: Sale }>(`/sales/${id}`).then(unwrap),

  voidSale: (id: string, reason?: string) =>
    apiClient.post<{ data: any }>(`/sales/${id}/void`, { reason }).then(unwrap),
};
