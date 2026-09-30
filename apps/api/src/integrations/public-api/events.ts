/** Webhook ke waqiat — Zapier / Make / apna server inhi naamon se sunta hai */
export const WEBHOOK_EVENTS = [
  { type: 'sale.created', label: 'Nayi sale (POS ya online)' },
  { type: 'customer.created', label: 'Naya customer' },
  { type: 'online_order.created', label: 'Naya online order' },
  { type: 'online_order.accepted', label: 'Online order accept hua' },
  { type: 'online_order.dispatched', label: 'Courier ko diya' },
  { type: 'online_order.delivered', label: 'Deliver ho gaya' },
  { type: 'online_order.cancelled', label: 'Cancel hua' },
  { type: 'online_order.returned', label: 'Wapas aaya (RTO)' },
  { type: 'stock.low', label: 'Stock kam reh gaya' },
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number]['type'];
export const EVENT_TYPES = WEBHOOK_EVENTS.map((e) => e.type) as string[];

export interface WebhookEvent {
  /** Pakki pehchan — same waqia dobara aaye to receiver isay dekh kar chhor de */
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: Record<string, unknown>;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export const serialize = {
  sale: (s: any) => ({
    id: s.id,
    number: s.saleNumber,
    shopId: s.shopId,
    customerId: s.customerId,
    customer: s.customer ? { id: s.customer.id, name: s.customer.name, phone: s.customer.phone } : null,
    source: s.source,
    status: s.status,
    paymentMethod: s.paymentMethod,
    subtotal: s.subtotal,
    discount: s.discount,
    total: s.total,
    paid: s.paidAmount,
    change: s.changeAmount,
    udhaar: s.creditAmount,
    refunded: s.refundedAmount,
    soldAt: s.soldAt?.toISOString?.() ?? s.soldAt,
    createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
    ...(s.items && {
      items: s.items.map((i: any) => ({
        productId: i.productId, name: i.product?.name ?? null, sku: i.product?.sku ?? null, barcode: i.product?.barcode ?? null,
        quantity: i.quantity, returned: i.returnedQty, price: i.price, total: i.total, note: i.note ?? null,
      })),
    }),
  }),
  customer: (c: any) => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email, city: c.city, area: c.area, address: c.address,
    shopId: c.shopId, balance: c.balance, totalSpent: c.totalSpent, loyaltyPoints: c.loyaltyPoints, isVip: c.isVip,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt,
  }),
  order: (o: any) => ({
    id: o.id,
    channel: o.integration ? { id: o.integrationId, name: o.integration.displayName, type: o.integration.type } : { id: o.integrationId },
    externalId: o.externalOrderId, number: o.externalOrderNumber,
    status: o.orderStatus, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
    customer: { name: o.customerName, phone: o.customerPhone, email: o.customerEmail, address: o.customerAddress, city: o.customerCity },
    items: Array.isArray(o.items) ? o.items : [],
    subtotal: num(o.subtotal), deliveryFee: num(o.deliveryFee), discount: num(o.discount), total: num(o.total),
    courier: o.courierName ? { name: o.courierName, code: o.courierCode, tracking: o.trackingNumber, status: o.courierStatus } : null,
    saleId: o.nafaaSaleId,
    receivedAt: o.receivedAt?.toISOString?.() ?? o.receivedAt,
    acceptedAt: o.acceptedAt ?? null, dispatchedAt: o.dispatchedAt ?? null, deliveredAt: o.deliveredAt ?? null,
    cancelledAt: o.cancelledAt ?? null, cancelReason: o.cancelReason ?? null, returnedAt: o.returnedAt ?? null, returnReason: o.returnReason ?? null,
  }),
  product: (p: any) => ({
    id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit,
    price: p.price, wholesalePrice: p.wholesalePrice, taxRate: p.taxRate,
    stock: p.stock, lowStockAlert: p.lowStockAlert, isActive: p.isActive,
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    ...(p.shopStocks && { shops: p.shopStocks.map((s: any) => ({ shopId: s.shopId, stock: s.stock, price: s.shopPrice ?? p.price })) }),
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  }),
};
