import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { PaymentMethod, ServiceChargeItem } from '@modules/sales/sales/api/sales.api';

export type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';

export interface SharedCartItem {
  cartLineId: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  variantImage?: string;
  variantColor?: string;
  variantColorHex?: string;
  variantSize?: string;
  basePrice: number;
  wholesalePrice?: number | null;
  stock: number;
  quantity: number;
  unit: string;
  category?: any;
  useWholesale: boolean;
  priceOverride?: number;
  lineDiscount: number;
  note?: string;

  // Industry-specific extras (all optional)
  imeiId?: string;
  imeiNumber?: string;
  rollId?: string;
  rollNumber?: string;
  cutPieceId?: string;
  cutPieceCode?: string;
  cutSqft?: number;
  cutWidthFt?: number;
  cutWidthInch?: number;
  cutLengthFt?: number;
  cutLengthInch?: number;
  cutLengthReal?: number;
  cutWidthReal?: number;
  createLeftover?: boolean;
  rollCustomerWidthFt?: number;
  rollFullWidthFt?: number;

  // Restaurant modifiers
  modifiers?: Array<{
    modifierOptionId: string;
    optionName: string;
    quantity: number;
    priceAdjustment: number;
  }>;

  specialInstructions?: string;
  spiceLevel?: string;
  cookingNote?: string;
}

export const cartLineId = () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useSharedPosCart() {
  const [cart, setCart] = useState<SharedCartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [saleMode, setSaleMode] = useState<SaleMode>('FULL_PAYMENT');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeItem[]>([]);

  const addLine = useCallback((line: Omit<SharedCartItem, 'cartLineId'>) => {
    setCart((prev) => [...prev, { ...line, cartLineId: cartLineId() }]);
  }, []);

  const updateLine = useCallback((lineId: string, patch: Partial<SharedCartItem>) => {
    setCart((prev) => prev.map((item) => (item.cartLineId === lineId ? { ...item, ...patch } : item)));
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setCart((prev) => prev.filter((item) => item.cartLineId !== lineId));
  }, []);

  const setLineQuantity = useCallback((lineId: string, qty: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.cartLineId === lineId);
      if (!item) return prev;
      if (item.imeiId || item.rollId || item.cutPieceId) {
        toast.error('Fixed quantity for this item');
        return prev;
      }
      if (qty < 0.01) {
        return prev.filter((i) => i.cartLineId !== lineId);
      }
      if (qty > item.stock) {
        toast.error(`Stock limit: ${item.stock} ${item.unit}`);
        return prev;
      }
      return prev.map((i) => (i.cartLineId === lineId ? { ...i, quantity: Number(qty.toFixed(2)) } : i));
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerId('');
    setPaymentMethod('CASH');
    setPaidAmount('');
    setGlobalDiscount('');
    setServiceCharges([]);
    setSaleMode('FULL_PAYMENT');
  }, []);

  const subtotal = cart.reduce((sum, item) => {
    const unitPrice = item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
    return sum + unitPrice * item.quantity;
  }, 0);

  const totalLineDiscount = cart.reduce((sum, item) => sum + (item.lineDiscount || 0), 0);
  const gDiscount = Number(globalDiscount) || 0;
  const svcTotal = serviceCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const total = Math.max(subtotal - totalLineDiscount - gDiscount + svcTotal, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const effectivePaid =
    saleMode === 'FULL_PAYMENT' ? total :
    saleMode === 'FULL_CREDIT' ? 0 :
    Number(paidAmount || 0);
  const credit = Math.max(total - effectivePaid, 0);

  return {
    cart, setCart,
    customerId, setCustomerId,
    paymentMethod, setPaymentMethod,
    paidAmount, setPaidAmount,
    saleMode, setSaleMode,
    globalDiscount, setGlobalDiscount,
    serviceCharges, setServiceCharges,
    addLine, updateLine, removeLine, setLineQuantity, clearCart,
    subtotal, total, totalItems, effectivePaid, credit, gDiscount, svcTotal,
  };
}
