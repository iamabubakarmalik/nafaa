import { BadRequestException } from '@nestjs/common';

/**
 * Website se aane wala order teen shakal me aa sakta hai:
 *
 *  1. Nafaa ka apna simple format (custom website / Nafaa WordPress plugin)
 *  2. WooCommerce ka built-in webhook (Settings → Advanced → Webhooks)
 *  3. Shopify ka built-in webhook (Settings → Notifications → Webhooks)
 *  4. Indolj (restaurant ordering platform) ka "General POS" webhook
 *
 * 2 aur 3 ka faida: dukandar ko koi plugin ya developer nahi chahiye —
 * sirf URL paste karna hai. Teeno ko yahan ek hi shakal me badal dete hain.
 */

export type OrderPlatform = 'custom' | 'woocommerce' | 'shopify' | 'daraz' | 'indolj' | 'foodpanda';

export interface NormalizedItem {
  name: string;
  sku?: string;
  externalProductId?: string;
  externalVariantId?: string;
  variant?: string;
  quantity: number;
  /** Ek unit ki qeemat (website wali) */
  price: number;
  image?: string;
  /** Sirf Nafaa ke apne test order me — product pehle se maloom */
  productId?: string;
}

export interface NormalizedOrder {
  platform: OrderPlatform;
  externalOrderId: string;
  externalOrderNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerLat?: number;
  customerLng?: number;
  items: NormalizedItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: 'PENDING' | 'PAID';
  /** Website ki taraf se order cancel/refund ho chuka hai */
  cancelled: boolean;
  notes?: string;
  shippingMethod?: string;
  paymentTitle?: string;
  /** Multi-branch: kis Nafaa branch ka order (URL ?branch= ya payload ki branch se) */
  shopId?: string | null;
}

const MAX_ITEMS = 300;

const num = (v: any, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: any): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, 500) : undefined;
};

const joinParts = (...parts: any[]): string | undefined =>
  str(parts.map((p) => str(p)).filter(Boolean).join(', '));

const fullName = (first: any, last: any): string | undefined =>
  str([str(first), str(last)].filter(Boolean).join(' '));

export function detectPlatform(body: any, headers: Record<string, any> = {}): OrderPlatform {
  if (headers['x-wc-webhook-source'] || headers['x-wc-webhook-topic']) return 'woocommerce';
  if (headers['x-shopify-topic'] || headers['x-shopify-shop-domain']) return 'shopify';
  if (isIndoljOrder(body)) return 'indolj';
  if (Array.isArray(body?.line_items)) {
    if (body.billing || body.shipping_total !== undefined) return 'woocommerce';
    if (body.total_price !== undefined || body.financial_status) return 'shopify';
  }
  return 'custom';
}

const PAID_WORDS = ['paid', 'completed', 'success', 'captured', 'processing'];
const CANCEL_WORDS = ['cancelled', 'canceled', 'refunded', 'failed', 'voided', 'trash'];

/** Website ka payment tareeqa → Nafaa ka PaymentMethod */
export function mapPaymentMethod(raw?: string): 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('jazz')) return 'JAZZCASH';
  if (v.includes('easypaisa') || v.includes('easy paisa')) return 'EASYPAISA';
  if (v.includes('bank') || v.includes('bacs') || v.includes('transfer') || v.includes('raast')) return 'BANK_TRANSFER';
  if (v.includes('card') || v.includes('stripe') || v.includes('shopify_payments') || v.includes('payfast')) return 'CARD';
  return 'CASH';
}

export function isCashOnDelivery(raw?: string): boolean {
  const v = (raw ?? '').toLowerCase();
  return !v || v === 'cod' || v.includes('cash') || v.includes('delivery');
}

function normalizeCustom(body: any): NormalizedOrder {
  const c = body.customer ?? {};
  const items: NormalizedItem[] = (Array.isArray(body.items) ? body.items : []).map((it: any) => ({
    name: str(it.name ?? it.productName ?? it.title) ?? 'Product',
    sku: str(it.sku ?? it.barcode),
    externalProductId: str(it.productId ?? it.product_id ?? it.id),
    externalVariantId: str(it.variantId ?? it.variant_id),
    variant: str(it.variant ?? it.size ?? it.variantName),
    quantity: num(it.quantity ?? it.qty, 1),
    price: num(it.price ?? it.unitPrice ?? it.rate),
    image: str(it.image ?? it.imageUrl),
  }));

  const subtotal = num(body.subtotal, items.reduce((s, i) => s + i.price * i.quantity, 0));
  const deliveryFee = num(body.deliveryFee ?? body.shippingFee ?? body.shipping);
  const discount = num(body.discount);
  const status = String(body.status ?? body.orderStatus ?? '').toLowerCase();
  const payStatus = String(body.paymentStatus ?? body.payment?.status ?? '').toLowerCase();

  return {
    platform: 'custom',
    externalOrderId: str(body.orderId ?? body.id ?? body.orderNumber) ?? '',
    externalOrderNumber: str(body.orderNumber ?? body.reference ?? body.orderId ?? body.id),
    customerName: str(c.name ?? body.customerName) ?? 'Customer',
    customerPhone: str(c.phone ?? body.customerPhone ?? body.phone),
    customerEmail: str(c.email ?? body.customerEmail ?? body.email),
    customerAddress: str(c.address ?? body.customerAddress ?? body.deliveryAddress ?? body.address),
    customerCity: str(c.city ?? body.customerCity ?? body.city),
    customerLat: body.customer?.lat ?? body.customerLat,
    customerLng: body.customer?.lng ?? body.customerLng,
    items,
    subtotal,
    deliveryFee,
    discount,
    total: num(body.total ?? body.amount ?? body.grandTotal, subtotal + deliveryFee - discount),
    paymentMethod: str(body.paymentMethod ?? body.payment?.method),
    paymentStatus: PAID_WORDS.includes(payStatus) ? 'PAID' : 'PENDING',
    cancelled: CANCEL_WORDS.includes(status),
    notes: str(body.notes ?? body.customerNotes ?? body.note),
    shippingMethod: str(body.shippingMethod),
    paymentTitle: str(body.paymentTitle ?? body.paymentMethod),
  };
}

function normalizeWoo(body: any): NormalizedOrder {
  const b = body.billing ?? {};
  const s = body.shipping ?? {};
  const hasShipping = !!(s.address_1 || s.first_name);
  const addr = hasShipping ? s : b;

  const items: NormalizedItem[] = (body.line_items ?? []).map((li: any) => {
    const qty = num(li.quantity, 1);
    // `subtotal` coupon se pehle ki line qeemat hai; coupon neeche
    // discount_total me alag aata hai — taake bill par discount dikhe.
    // Tax bhi shamil — customer ne wahi diya, bill ka total website se mile
    const unit = li.subtotal !== undefined
      ? (num(li.subtotal) + num(li.subtotal_tax)) / Math.max(qty, 1)
      : num(li.price);
    const variantMeta = Array.isArray(li.meta_data)
      ? li.meta_data
          .filter((m: any) => typeof m?.value === 'string' && !String(m.key).startsWith('_'))
          .map((m: any) => m.display_value ?? m.value)
          .join(' / ')
      : undefined;
    return {
      name: str(li.name) ?? 'Product',
      sku: str(li.sku),
      externalProductId: str(li.product_id),
      externalVariantId: li.variation_id ? str(li.variation_id) : undefined,
      variant: str(variantMeta),
      quantity: qty,
      price: unit,
      image: str(li.image?.src),
    };
  });

  const status = String(body.status ?? '').toLowerCase();
  const discount = num(body.discount_total) + num(body.discount_tax);
  const deliveryFee = num(body.shipping_total) + num(body.shipping_tax);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const isPaid = !!body.date_paid || (body.payment_method && body.payment_method !== 'cod' && status === 'processing');

  return {
    platform: 'woocommerce',
    externalOrderId: str(body.id) ?? '',
    externalOrderNumber: str(body.number ?? body.id),
    customerName: fullName(addr.first_name, addr.last_name) ?? str(b.company) ?? 'Customer',
    customerPhone: str(b.phone ?? s.phone),
    customerEmail: str(b.email),
    customerAddress: joinParts(addr.address_1, addr.address_2, addr.state, addr.postcode),
    customerCity: str(addr.city),
    items,
    subtotal,
    deliveryFee,
    discount,
    total: num(body.total, subtotal - discount + deliveryFee),
    paymentMethod: str(body.payment_method),
    paymentStatus: isPaid ? 'PAID' : 'PENDING',
    cancelled: CANCEL_WORDS.includes(status),
    notes: str(body.customer_note),
    shippingMethod: str(body.shipping_lines?.[0]?.method_title),
    paymentTitle: str(body.payment_method_title),
  };
}

function normalizeShopify(body: any): NormalizedOrder {
  const sa = body.shipping_address ?? body.billing_address ?? {};
  const cust = body.customer ?? {};
  const items: NormalizedItem[] = (body.line_items ?? []).map((li: any) => ({
    name: str(li.title ?? li.name) ?? 'Product',
    sku: str(li.sku),
    externalProductId: str(li.product_id),
    externalVariantId: str(li.variant_id),
    variant: li.variant_title && li.variant_title !== 'Default Title' ? str(li.variant_title) : undefined,
    quantity: num(li.quantity, 1),
    price: num(li.price),
  }));

  const deliveryFee = (body.shipping_lines ?? []).reduce((s: number, l: any) => s + num(l.price), 0);
  const financial = String(body.financial_status ?? '').toLowerCase();
  const gateway = str(body.payment_gateway_names?.[0] ?? body.gateway);

  return {
    platform: 'shopify',
    externalOrderId: str(body.id) ?? '',
    externalOrderNumber: str(body.name ?? body.order_number)?.replace(/^#+/, ''),
    customerName:
      str(sa.name) ?? fullName(cust.first_name, cust.last_name) ?? 'Customer',
    customerPhone: str(sa.phone ?? body.phone ?? cust.phone),
    customerEmail: str(body.email ?? cust.email),
    customerAddress: joinParts(sa.address1, sa.address2, sa.province, sa.zip),
    customerCity: str(sa.city),
    customerLat: sa.latitude ?? undefined,
    customerLng: sa.longitude ?? undefined,
    items,
    subtotal: num(body.subtotal_price, items.reduce((s, i) => s + i.price * i.quantity, 0)),
    deliveryFee,
    discount: num(body.total_discounts),
    total: num(body.total_price),
    paymentMethod: gateway,
    paymentStatus: financial === 'paid' ? 'PAID' : 'PENDING',
    cancelled: !!body.cancelled_at || ['refunded', 'voided'].includes(financial),
    notes: str(body.note),
    shippingMethod: str(body.shipping_lines?.[0]?.title),
    paymentTitle: gateway,
  };
}

/** Indolj ka order: merchantId + total (object) + customer.firstName / items[].qty */
export function isIndoljOrder(body: any): boolean {
  if (!body || typeof body !== 'object') return false;
  const items = body.items ?? body.Items;
  const marks = body.merchantId !== undefined || body.partnerIndexCode !== undefined || body.orderSource !== undefined
    || body.customer?.firstName !== undefined || body.customer?.phoneNumber !== undefined
    || (typeof body.total === 'object' && body.total !== null && body.total.grandTotal !== undefined);
  return marks && !!body.orderId && Array.isArray(items);
}

/** Indolj ka status webhook: { order_id, status, updated_at, total_amount } */
export function isIndoljStatus(body: any): boolean {
  return !!body && typeof body === 'object' && !!body.order_id && typeof body.status === 'string' && !body.items && !body.Items && !body.line_items;
}

function normalizeIndolj(body: any): NormalizedOrder {
  const c = body.customer ?? {};
  const d = body.dropOff ?? body.dropoff ?? {};
  const t = (typeof body.total === 'object' && body.total) || {};
  const items: NormalizedItem[] = [];
  const notes: string[] = [];
  for (const it of (body.items ?? body.Items ?? []) as any[]) {
    const qty = num(it.qty ?? it.quantity, 1);
    // discountedPrice item ki asal (discount ke baad) qeemat — warna price
    const unit = num(it.discountedPrice, 0) > 0 ? num(it.discountedPrice) : num(it.price);
    items.push({
      name: str(it.name) ?? 'Item',
      sku: str(it.sku ?? it.variationPosCode ?? it.itemPosCode ?? it.posCode),
      externalProductId: str(it.id),
      variant: str(it.size),
      quantity: qty,
      price: unit,
    });
    if (str(it.orderNotes)) notes.push(`${str(it.name)}: ${str(it.orderNotes)}`);
    // Add-ons (extra cheese, drink…) alag line — bill aur kitchen dono me dikhe
    for (const a of (it.subItems ?? it.subitems ?? []) as any[]) {
      items.push({
        name: `+ ${str(a.addon_name) ?? 'Add-on'}${str(a.addon_category) ? ` (${str(a.addon_category)})` : ''}`,
        sku: str(a.pos_code),
        externalProductId: str(a.addon_id),
        quantity: num(a.addon_qty, 0) > 0 ? num(a.addon_qty) : qty,
        price: num(a.addon_price),
      });
    }
  }
  const subtotal = num(t.subtotal, items.reduce((s, i) => s + i.price * i.quantity, 0));
  const deliveryFee = num(t.deliveryCharges);
  const discount = num(t.discountedAmount) + num(t.loyaltyPointsDiscount);
  const status = String(body.orderStatus ?? '').toLowerCase();
  const pay = String(body.payment ?? body.paymentStatus ?? '').toLowerCase();
  const type = str(body.orderType);
  if (str(c.deliveryInstruction)) notes.unshift(str(c.deliveryInstruction)!);
  if (type) notes.unshift(`Order type: ${type}`);
  if (num(t.tax) > 0) notes.push(`Tax ${num(t.tax)}${t.taxPercentage ? ` (${t.taxPercentage}%)` : ''} shamil`);
  if (str(t.voucherCode)) notes.push(`Voucher: ${str(t.voucherCode)}`);

  return {
    platform: 'indolj',
    externalOrderId: str(body.orderId) ?? '',
    externalOrderNumber: str(body.orderId),
    customerName: fullName(c.firstName, c.lastName) ?? 'Customer',
    customerPhone: str(c.phoneNumber ?? c.alternatePhone),
    customerEmail: str(c.email),
    customerAddress: joinParts(c.address ?? d.street, d.unit, c.nearestLandMark && `Near ${c.nearestLandMark}`),
    customerCity: str(d.city),
    customerLat: d.latitude !== undefined ? num(d.latitude) : undefined,
    customerLng: d.longitude !== undefined ? num(d.longitude) : undefined,
    items,
    subtotal,
    deliveryFee,
    discount,
    // grandTotal me tax bhi — customer ne wahi dena hai
    total: num(t.grandTotal, subtotal + deliveryFee - discount + num(t.tax)),
    paymentMethod: str(body.paymentType),
    paymentStatus: PAID_WORDS.includes(pay) || pay === 'paid' ? 'PAID' : 'PENDING',
    cancelled: CANCEL_WORDS.includes(status),
    notes: str(notes.join(' · ')),
    shippingMethod: type,
    paymentTitle: str(body.paymentType),
  };
}

export function normalizeOrder(body: any, platform: OrderPlatform): NormalizedOrder {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Order ka data JSON me bhejein');
  }

  const order =
    platform === 'woocommerce' ? normalizeWoo(body)
      : platform === 'shopify' ? normalizeShopify(body)
        : platform === 'indolj' ? normalizeIndolj(body)
          : normalizeCustom(body);

  if (!order.externalOrderId) {
    throw new BadRequestException('orderId zaroori hai');
  }
  if (!order.items.length) {
    throw new BadRequestException('items khali hain — kam az kam ek item bhejein');
  }
  if (order.items.length > MAX_ITEMS) {
    throw new BadRequestException(`Ek order me ${MAX_ITEMS} se zyada items nahi ho sakte`);
  }
  for (const it of order.items) {
    if (!(it.quantity > 0)) throw new BadRequestException(`${it.name}: quantity 0 se zyada honi chahiye`);
    if (it.price < 0) throw new BadRequestException(`${it.name}: price ghalat hai`);
  }
  if (order.total < 0) throw new BadRequestException('total ghalat hai');

  return order;
}
