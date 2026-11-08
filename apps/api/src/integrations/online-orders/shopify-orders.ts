/**
 * Shopify orders read through GraphQL (the order pull that catches orders a
 * webhook missed), turned into the order webhook's REST shape so the one
 * Shopify normalizer reads both.
 */

export const SHOPIFY_ORDERS = `query($after: String, $q: String) {
  orders(first: 50, after: $after, query: $q, sortKey: UPDATED_AT) {
    nodes {
      legacyResourceId name email phone note cancelledAt test
      displayFinancialStatus displayFulfillmentStatus paymentGatewayNames
      subtotalPriceSet { shopMoney { amount } }
      totalPriceSet { shopMoney { amount } }
      totalDiscountsSet { shopMoney { amount } }
      shippingLines(first: 5) { nodes { title originalPriceSet { shopMoney { amount } } } }
      shippingAddress { name firstName lastName address1 address2 city province zip phone latitude longitude }
      billingAddress { name firstName lastName address1 address2 city province zip phone }
      customer { firstName lastName }
      lineItems(first: 100) { nodes { title sku quantity variantTitle originalUnitPriceSet { shopMoney { amount } } variant { legacyResourceId } product { legacyResourceId } } }
      fulfillments(first: 5) { displayStatus }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const amount = (m: any) => m?.shopMoney?.amount ?? '0';

/** A GraphQL order in the shape of Shopify's order webhook, so one normalizer reads both. */
export function shopifyRestShape(o: any) {
  const addr = (a: any) => (a ? {
    name: a.name, first_name: a.firstName, last_name: a.lastName, address1: a.address1, address2: a.address2,
    city: a.city, province: a.province, zip: a.zip, phone: a.phone, latitude: a.latitude, longitude: a.longitude,
  } : null);
  const fin = String(o.displayFinancialStatus ?? '').toLowerCase();
  const ful = String(o.displayFulfillmentStatus ?? '').toUpperCase();
  return {
    id: String(o.legacyResourceId),
    name: o.name,
    email: o.email,
    phone: o.phone,
    note: o.note,
    cancelled_at: o.cancelledAt,
    financial_status: fin,
    fulfillment_status: ful === 'FULFILLED' ? 'fulfilled' : ful === 'PARTIALLY_FULFILLED' ? 'partial' : null,
    payment_gateway_names: o.paymentGatewayNames ?? [],
    subtotal_price: amount(o.subtotalPriceSet),
    total_price: amount(o.totalPriceSet),
    total_discounts: amount(o.totalDiscountsSet),
    shipping_lines: (o.shippingLines?.nodes ?? []).map((l: any) => ({ title: l.title, price: amount(l.originalPriceSet) })),
    shipping_address: addr(o.shippingAddress),
    billing_address: addr(o.billingAddress),
    customer: o.customer ? { first_name: o.customer.firstName, last_name: o.customer.lastName } : null,
    line_items: (o.lineItems?.nodes ?? []).map((li: any) => ({
      title: li.title, sku: li.sku, quantity: li.quantity, variant_title: li.variantTitle,
      price: amount(li.originalUnitPriceSet),
      variant_id: li.variant?.legacyResourceId ?? null, product_id: li.product?.legacyResourceId ?? null,
    })),
    fulfillments: (o.fulfillments ?? []).map((f: any) => ({
      shipment_status: f.displayStatus === 'DELIVERED' ? 'delivered' : f.displayStatus === 'FAILURE' ? 'failure' : String(f.displayStatus ?? '').toLowerCase(),
    })),
  };
}

