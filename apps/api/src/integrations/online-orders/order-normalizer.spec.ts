import * as crypto from 'crypto';
import { detectPlatform, isCashOnDelivery, mapPaymentMethod, normalizeOrder } from './order-normalizer';
import { assertSafeWebhookUrl, verifySignature } from './website-config';

describe('order-normalizer', () => {
  it('custom (Nafaa format) order', () => {
    const o = normalizeOrder({
      orderId: 1042,
      customer: { name: 'Ahmed', phone: '03001234567', city: 'Lahore' },
      items: [{ sku: 'A1', name: 'Shirt', quantity: 2, price: 1500 }],
      deliveryFee: 200,
      total: 3200,
      paymentMethod: 'cod',
    }, 'custom');
    expect(o.externalOrderId).toBe('1042');
    expect(o.customerName).toBe('Ahmed');
    expect(o.subtotal).toBe(3000);
    expect(o.total).toBe(3200);
    expect(o.paymentStatus).toBe('PENDING');
    expect(o.cancelled).toBe(false);
  });

  it('WooCommerce webhook: coupon alag, shipping address pehle', () => {
    const body = {
      id: 77, number: '77', status: 'processing', total: '2700.00', shipping_total: '200.00', discount_total: '500.00',
      payment_method: 'cod', payment_method_title: 'Cash on delivery',
      billing: { first_name: 'Sara', last_name: 'Ali', phone: '03211234567', email: 's@x.pk', city: 'Karachi', address_1: 'Billing st' },
      shipping: { first_name: 'Sara', last_name: 'Ali', address_1: 'House 5', city: 'Lahore' },
      line_items: [{ name: 'Cap', product_id: 10, variation_id: 0, quantity: 2, subtotal: '3000.00', price: 1250, sku: 'CAP' }],
    };
    expect(detectPlatform(body)).toBe('woocommerce');
    const o = normalizeOrder(body, 'woocommerce');
    expect(o.customerName).toBe('Sara Ali');
    expect(o.customerCity).toBe('Lahore');
    expect(o.items[0].price).toBe(1500);
    expect(o.items[0].externalVariantId).toBeUndefined();
    expect(o.discount).toBe(500);
    expect(o.subtotal - o.discount + o.deliveryFee).toBe(o.total);
    expect(o.paymentStatus).toBe('PENDING');
  });

  it('Shopify webhook', () => {
    const body = {
      id: 5550001, name: '#1001', total_price: '4200.00', subtotal_price: '4000.00', total_discounts: '0.00', financial_status: 'paid',
      shipping_address: { name: 'Bilal Khan', address1: 'Street 9', city: 'Islamabad', phone: '03331234567' },
      shipping_lines: [{ price: '200.00', title: 'Standard' }],
      line_items: [{ title: 'Watch', variant_title: 'Black', sku: 'W-BLK', quantity: 1, price: '4000.00', product_id: 1, variant_id: 2 }],
    };
    expect(detectPlatform(body)).toBe('shopify');
    const o = normalizeOrder(body, 'shopify');
    expect(o.externalOrderNumber).toBe('#1001');
    expect(o.paymentStatus).toBe('PAID');
    expect(o.deliveryFee).toBe(200);
    expect(o.items[0].variant).toBe('Black');
  });

  it('khali ya ghalat order reject', () => {
    expect(() => normalizeOrder({ orderId: 1, items: [] }, 'custom')).toThrow();
    expect(() => normalizeOrder({ items: [{ name: 'x', quantity: 1, price: 1 }] }, 'custom')).toThrow();
    expect(() => normalizeOrder({ orderId: 1, items: [{ name: 'x', quantity: 0, price: 1 }] }, 'custom')).toThrow();
  });

  it('payment method mapping', () => {
    expect(mapPaymentMethod('jazzcash_mwallet')).toBe('JAZZCASH');
    expect(mapPaymentMethod('bacs')).toBe('BANK_TRANSFER');
    expect(mapPaymentMethod('stripe')).toBe('CARD');
    expect(mapPaymentMethod('cod')).toBe('CASH');
    expect(isCashOnDelivery('cod')).toBe(true);
    expect(isCashOnDelivery('stripe')).toBe(false);
  });
});

describe('verifySignature', () => {
  const raw = Buffer.from('{"orderId":"1"}');
  const secret = 'nfs_test';

  it('Nafaa hex signature', () => {
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
    expect(verifySignature({ rawBody: raw, headers: { 'x-nafaa-signature': sig }, webhookSecret: secret })).toBe('valid');
    expect(verifySignature({ rawBody: raw, headers: { 'x-nafaa-signature': 'sha256=bad' }, webhookSecret: secret })).toBe('invalid');
  });

  it('WooCommerce base64 signature', () => {
    const sig = crypto.createHmac('sha256', secret).update(raw).digest('base64');
    expect(verifySignature({ rawBody: raw, headers: { 'x-wc-webhook-signature': sig }, webhookSecret: secret })).toBe('valid');
  });

  it('Shopify: key na ho to missing', () => {
    expect(verifySignature({ rawBody: raw, headers: { 'x-shopify-hmac-sha256': 'abc' }, webhookSecret: secret })).toBe('missing');
    expect(verifySignature({ rawBody: raw, headers: {}, webhookSecret: secret })).toBe('missing');
  });
});

describe('assertSafeWebhookUrl', () => {
  const env = process.env.NODE_ENV;
  afterAll(() => { process.env.NODE_ENV = env; });

  it('production me private/http URL band', () => {
    process.env.NODE_ENV = 'production';
    expect(() => assertSafeWebhookUrl('http://shop.pk/x')).toThrow();
    expect(() => assertSafeWebhookUrl('https://169.254.169.254/latest')).toThrow();
    expect(() => assertSafeWebhookUrl('https://localhost/x')).toThrow();
    expect(assertSafeWebhookUrl('https://shop.pk/wp-json/nafaa/v1/status')).toContain('shop.pk');
  });
});
