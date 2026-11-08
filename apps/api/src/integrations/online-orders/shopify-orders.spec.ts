import { normalizeOrder } from './order-normalizer';
import { shopifyStatusKeys } from './channel-status-map';
import { shopifyRestShape } from './shopify-orders';

const gql = {
  legacyResourceId: '5550001', name: '#1042', email: 'a@b.pk', phone: null, note: 'Jaldi', cancelledAt: null, test: false,
  displayFinancialStatus: 'PENDING', displayFulfillmentStatus: 'FULFILLED', paymentGatewayNames: ['Cash on Delivery (COD)'],
  subtotalPriceSet: { shopMoney: { amount: '2400.0' } },
  totalPriceSet: { shopMoney: { amount: '2550.0' } },
  totalDiscountsSet: { shopMoney: { amount: '100.0' } },
  shippingLines: { nodes: [{ title: 'Standard', originalPriceSet: { shopMoney: { amount: '250.0' } } }] },
  shippingAddress: { name: 'Ali Raza', firstName: 'Ali', lastName: 'Raza', address1: 'House 1', address2: null, city: 'Lahore', province: 'Punjab', zip: '54000', phone: '03001234567', latitude: null, longitude: null },
  billingAddress: null,
  customer: { firstName: 'Ali', lastName: 'Raza' },
  lineItems: { nodes: [{ title: 'Kurta', sku: 'K-1', quantity: 2, variantTitle: 'M', originalUnitPriceSet: { shopMoney: { amount: '1250.0' } }, variant: { legacyResourceId: '77' }, product: { legacyResourceId: '66' } }] },
  fulfillments: [{ displayStatus: 'DELIVERED' }],
};

describe('shopifyRestShape', () => {
  it('reads like the order webhook', () => {
    const o = normalizeOrder(shopifyRestShape(gql), 'shopify');
    expect(o).toMatchObject({
      externalOrderId: '5550001', externalOrderNumber: '1042', customerName: 'Ali Raza', customerPhone: '03001234567', customerCity: 'Lahore',
      subtotal: 2400, deliveryFee: 250, discount: 100, total: 2550, paymentStatus: 'PENDING', cancelled: false, notes: 'Jaldi',
    });
    expect(o.items).toEqual([expect.objectContaining({ name: 'Kurta', sku: 'K-1', quantity: 2, price: 1250, variant: 'M', externalProductId: '66', externalVariantId: '77' })]);
  });
  it('carries the status keys', () => {
    expect(shopifyStatusKeys(shopifyRestShape(gql))).toEqual(['fulfilled', 'delivered']);
    expect(shopifyStatusKeys(shopifyRestShape({ ...gql, displayFinancialStatus: 'PAID', cancelledAt: '2026-11-09T00:00:00Z', fulfillments: [] })))
      .toEqual(['paid', 'cancelled', 'fulfilled']);
  });
});
