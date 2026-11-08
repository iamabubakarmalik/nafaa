import { Injectable, Logger } from '@nestjs/common';
import { Integration } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyService } from './shopify.service';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyClient, numericId, orderGid } from './shopify.client';
import { apiText } from '../../common/i18n/api-message';

/**
 * Sends an order edit made in Nafaa back to the store it came from, and
 * creates orders on Shopify for the "Add order" page.
 *
 * Shopify: GraphQL order editing (begin → quantities / new variants / custom
 * items / line discounts → commit) plus orderUpdate for the address and note.
 * WooCommerce: PUT on the order with line_items and shipping.
 * Other channels have no edit API; the caller gets the reason.
 * A failure is returned, never thrown: the Nafaa edit stays as it is.
 */

export interface SyncItem {
  name: string;
  sku?: string;
  variant?: string;
  quantity: number;
  price: number;
  productId?: string;
  variantId?: string | null;
  externalProductId?: string;
  externalVariantId?: string;
}

export interface SyncResult { channel: string; ok: boolean; message: string }

export interface SyncCustomer {
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  notes?: string | null;
}

const variantGid = (id: string) => (String(id).startsWith('gid://') ? String(id) : `gid://shopify/ProductVariant/${id}`);
const splitName = (full: string | null | undefined) => {
  const parts = String(full ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.slice(0, -1).join(' ') || parts[0] || 'Customer', lastName: parts.length > 1 ? parts[parts.length - 1] : '' };
};

/** Channels whose orders can be edited from Nafaa. */
export const EDITABLE_CHANNELS = ['SHOPIFY', 'WOOCOMMERCE'];

@Injectable()
export class OrderChannelSyncService {
  private readonly logger = new Logger(OrderChannelSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shopify: ShopifyService,
    private readonly woo: WooCommerceService,
  ) {}

  /** Whether the order's channel can take an edit at all (for the UI switch). */
  canEdit(integration: Integration) {
    if (integration.type === 'SHOPIFY') return this.shopify.isConnected(integration);
    if (integration.type === 'WOOCOMMERCE') return this.woo.isConnected(integration);
    return false;
  }

  async pushEdit(
    integration: Integration,
    order: { externalOrderId: string },
    before: SyncItem[],
    after: SyncItem[],
    customer: SyncCustomer | null,
  ): Promise<SyncResult> {
    const channel = integration.type;
    if (EDITABLE_CHANNELS.includes(channel) && !/^\d+$/.test(String(order.externalOrderId))) {
      return { channel, ok: false, message: apiText('Ye order store par Nafaa se nahi bana ya split hua hai — store par khud badlein') };
    }
    try {
      if (channel === 'SHOPIFY') return await this.shopifyEdit(integration, order.externalOrderId, before, after, customer);
      if (channel === 'WOOCOMMERCE') return await this.wooEdit(integration, order.externalOrderId, before, after, customer);
    } catch (e: any) {
      const message = String(e?.message ?? 'Store ne edit nahi liya').slice(0, 300);
      this.logger.warn(`Order edit sync failed (${channel} ${order.externalOrderId}): ${message}`);
      await this.log(integration, 'ORDER_EDIT', false, message, { orderId: order.externalOrderId });
      return { channel, ok: false, message };
    }
    if (channel === 'DARAZ') return { channel, ok: false, message: apiText('Daraz order Nafaa se nahi badalta — Daraz Seller Center me badlein') };
    if (channel === 'FOODPANDA') return { channel, ok: false, message: apiText('Foodpanda order Nafaa se nahi badalta') };
    if (channel === 'MANUAL') return { channel, ok: false, message: apiText('Ye Nafaa ka apna order hai — kisi store par bhejne ki zaroorat nahi') };
    return { channel, ok: false, message: apiText('Is channel par order Nafaa se nahi badalta — website par khud badlein') };
  }

  // ─── Shopify ─────────────────────────────────────────────

  private async shopifyClient(integration: Integration): Promise<ShopifyClient> {
    if (this.shopify.planBlocked(integration)) throw new Error(apiText('Shopify plan active nahi — pehle plan chalu karein'));
    const client = await this.shopify.client(integration);
    if (!client) throw new Error(apiText('Shopify jura nahi — pehle "Shopify se jorein" dabayein'));
    return client;
  }

  /** Shopify variant id (numeric) linked to a Nafaa product/size on this channel. */
  private async linkedVariant(integrationId: string, productId?: string, variantId?: string | null) {
    if (!productId) return null;
    const m = await this.prisma.productChannelMapping.findFirst({
      where: { integrationId, productId, variantId: variantId ?? null, externalVariantId: { not: null } },
      select: { externalVariantId: true },
    });
    return m?.externalVariantId ?? null;
  }

  private async shopifyEdit(integration: Integration, externalOrderId: string, before: SyncItem[], after: SyncItem[], customer: SyncCustomer | null): Promise<SyncResult> {
    const client = await this.shopifyClient(integration);
    const id = orderGid(externalOrderId);
    const notes: string[] = [];

    const itemsChanged = JSON.stringify(before.map((i) => [i.name, i.variant, i.quantity, i.price, i.productId, i.variantId]))
      !== JSON.stringify(after.map((i) => [i.name, i.variant, i.quantity, i.price, i.productId, i.variantId]));

    if (itemsChanged) {
      const begun = await client.mutate<any>(`mutation($id: ID!) {
        orderEditBegin(id: $id) {
          calculatedOrder {
            id
            lineItems(first: 100) { nodes { id quantity title sku variant { id } originalUnitPriceSet { shopMoney { amount currencyCode } } } }
          }
          userErrors { field message }
        }
      }`, { id }, 'orderEditBegin');
      const calc = begun?.calculatedOrder;
      if (!calc?.id) throw new Error(apiText('Shopify ne edit shuru nahi kiya'));
      const lines: Array<{ id: string; quantity: number; title: string; sku: string | null; variantId: string | null; price: number; currency: string }> =
        (calc.lineItems?.nodes ?? []).map((n: any) => ({
          id: n.id, quantity: Number(n.quantity) || 0, title: String(n.title ?? ''), sku: n.sku ?? null,
          variantId: n.variant?.id ?? null, price: Number(n.originalUnitPriceSet?.shopMoney?.amount ?? 0),
          currency: n.originalUnitPriceSet?.shopMoney?.currencyCode ?? 'PKR',
        }));
      const currency = lines[0]?.currency ?? await client.graphql<any>(`query($id: ID!) { order(id: $id) { currencyCode } }`, { id })
        .then((d) => d?.order?.currencyCode ?? 'PKR').catch(() => 'PKR');

      // Each new item finds the Shopify line it came from (variant, then SKU, then title).
      const lineFor = async (it: SyncItem) => {
        const ext = it.externalVariantId ?? await this.linkedVariant(integration.id, it.productId, it.variantId);
        if (ext) {
          const hit = lines.find((l) => l.variantId === variantGid(ext));
          if (hit) return { line: hit, variant: variantGid(ext) };
          return { line: null, variant: variantGid(ext) };
        }
        const bySku = it.sku ? lines.find((l) => l.sku && l.sku === it.sku) : undefined;
        if (bySku) return { line: bySku, variant: bySku.variantId };
        const byTitle = lines.find((l) => l.title.trim().toLowerCase() === it.name.trim().toLowerCase());
        return { line: byTitle ?? null, variant: byTitle?.variantId ?? null };
      };

      const want = new Map<string, { qty: number; price: number }>();
      const adds: Array<{ it: SyncItem; variant: string | null }> = [];
      for (const it of after) {
        const r = await lineFor(it);
        if (r.line) {
          const w = want.get(r.line.id) ?? { qty: 0, price: it.price };
          w.qty += it.quantity;
          w.price = Math.min(w.price, it.price);
          want.set(r.line.id, w);
        } else {
          adds.push({ it, variant: r.variant });
        }
      }

      for (const l of lines) {
        const w = want.get(l.id);
        const qty = w ? Math.round(w.qty) : 0;
        if (qty !== l.quantity) {
          await client.mutate(`mutation($id: ID!, $lineItemId: ID!, $quantity: Int!) {
            orderEditSetQuantity(id: $id, lineItemId: $lineItemId, quantity: $quantity, restock: true) { calculatedOrder { id } userErrors { field message } }
          }`, { id: calc.id, lineItemId: l.id, quantity: qty }, 'orderEditSetQuantity');
        }
        if (w && qty > 0 && w.price < l.price - 0.009) {
          await this.lineDiscount(client, calc.id, l.id, l.price - w.price, currency);
        } else if (w && w.price > l.price + 0.009) {
          notes.push(apiText('Shopify par line ki qeemat barhai nahi ja sakti'));
        }
      }

      for (const { it, variant } of adds) {
        if (variant) {
          const added = await client.mutate<any>(`mutation($id: ID!, $variantId: ID!, $quantity: Int!) {
            orderEditAddVariant(id: $id, variantId: $variantId, quantity: $quantity, allowDuplicates: true) {
              calculatedLineItem { id originalUnitPriceSet { shopMoney { amount } } }
              userErrors { field message }
            }
          }`, { id: calc.id, variantId: variant, quantity: Math.max(1, Math.round(it.quantity)) }, 'orderEditAddVariant');
          const unit = Number(added?.calculatedLineItem?.originalUnitPriceSet?.shopMoney?.amount ?? it.price);
          if (added?.calculatedLineItem?.id && it.price < unit - 0.009) await this.lineDiscount(client, calc.id, added.calculatedLineItem.id, unit - it.price, currency);
        } else {
          await client.mutate(`mutation($id: ID!, $title: String!, $price: MoneyInput!, $quantity: Int!) {
            orderEditAddCustomItem(id: $id, title: $title, price: $price, quantity: $quantity, requiresShipping: true, taxable: false) {
              calculatedLineItem { id } userErrors { field message }
            }
          }`, {
            id: calc.id,
            title: it.variant ? `${it.name} — ${it.variant}` : it.name,
            price: { amount: String(it.price), currencyCode: currency },
            quantity: Math.max(1, Math.round(it.quantity)),
          }, 'orderEditAddCustomItem');
        }
      }

      await client.mutate(`mutation($id: ID!) {
        orderEditCommit(id: $id, notifyCustomer: false, staffNote: "Nafaa se order edit") { order { id } userErrors { field message } }
      }`, { id: calc.id }, 'orderEditCommit');
    }

    if (customer && Object.values(customer).some((v) => v !== undefined)) {
      const input: Record<string, any> = { id };
      if (customer.notes !== undefined) input.note = customer.notes ?? '';
      if (customer.customerName !== undefined || customer.customerAddress !== undefined || customer.customerCity !== undefined || customer.customerPhone !== undefined) {
        const { firstName, lastName } = splitName(customer.customerName);
        input.shippingAddress = {
          firstName, lastName,
          ...(customer.customerAddress != null && { address1: customer.customerAddress }),
          ...(customer.customerCity != null && { city: customer.customerCity }),
          ...(customer.customerPhone != null && { phone: customer.customerPhone }),
        };
      }
      await client.mutate(`mutation($input: OrderInput!) { orderUpdate(input: $input) { order { id } userErrors { field message } } }`, { input }, 'orderUpdate');
    }

    notes.push(apiText('Delivery charge aur poore order ka Discount Shopify par khud check karein'));
    await this.log(integration, 'ORDER_EDIT', true, undefined, { orderId: externalOrderId });
    return { channel: 'SHOPIFY', ok: true, message: [apiText('Shopify order bhi badal gaya'), ...notes].join('. ') };
  }

  private async lineDiscount(client: ShopifyClient, calcId: string, lineItemId: string, perUnit: number, currency: string) {
    await client.mutate(`mutation($id: ID!, $lineItemId: ID!, $discount: OrderEditAppliedDiscountInput!) {
      orderEditAddLineItemDiscount(id: $id, lineItemId: $lineItemId, discount: $discount) { calculatedOrder { id } userErrors { field message } }
    }`, {
      id: calcId, lineItemId,
      discount: { description: 'Nafaa price', fixedValue: { amount: String(Math.round(perUnit * 100) / 100), currencyCode: currency } },
    }, 'orderEditAddLineItemDiscount');
  }

  /**
   * Creates an order on Shopify (Add order page, "Nafaa + Shopify" target).
   * Linked variants keep Shopify stock right; unlinked products go as custom
   * lines. Returns Shopify's numeric id and order name.
   */
  async createShopifyOrder(integration: Integration, input: {
    customer: { name: string; phone: string; address?: string | null; city?: string | null };
    items: Array<SyncItem>;
    deliveryFee: number;
    discount: number;
    isCod: boolean;
    notes?: string | null;
  }): Promise<{ externalOrderId: string; externalOrderNumber: string }> {
    const client = await this.shopifyClient(integration);
    const currency = await client.graphql<any>(`{ shop { currencyCode } }`).then((d) => d?.shop?.currencyCode ?? 'PKR').catch(() => 'PKR');
    const money = (n: number) => ({ shopMoney: { amount: String(Math.round(n * 100) / 100), currencyCode: currency } });
    const lineItems = [];
    for (const it of input.items) {
      const ext = it.externalVariantId ?? await this.linkedVariant(integration.id, it.productId, it.variantId);
      lineItems.push(ext
        ? { variantId: variantGid(ext), quantity: Math.max(1, Math.round(it.quantity)), priceSet: money(it.price) }
        : { title: it.variant ? `${it.name} — ${it.variant}` : it.name, quantity: Math.max(1, Math.round(it.quantity)), priceSet: money(it.price), requiresShipping: true, taxable: false });
    }
    const { firstName, lastName } = splitName(input.customer.name);
    const address = {
      firstName, lastName,
      address1: input.customer.address || input.customer.city || '-',
      city: input.customer.city || '',
      phone: input.customer.phone,
      countryCode: 'PK',
    };
    const order: Record<string, any> = {
      lineItems,
      shippingAddress: address,
      billingAddress: address,
      phone: input.customer.phone,
      note: input.notes ?? undefined,
      tags: ['Nafaa'],
      financialStatus: input.isCod ? 'PENDING' : 'PAID',
      ...(input.deliveryFee > 0 && { shippingLines: [{ title: 'Delivery', priceSet: money(input.deliveryFee) }] }),
      ...(input.discount > 0 && { discountCode: { itemFixedDiscountCode: { code: 'NAFAA', amountSet: money(input.discount) } } }),
    };
    const res = await client.mutate<any>(`mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
      orderCreate(order: $order, options: $options) { order { id name } userErrors { field message } }
    }`, { order, options: { inventoryBehaviour: 'DECREMENT_OBEYING_POLICY', sendReceipt: false, sendFulfillmentReceipt: false } }, 'orderCreate');
    const created = res?.order;
    if (!created?.id) throw new Error(apiText('Shopify ne order nahi banaya'));
    await this.log(integration, 'ORDER_CREATE', true, undefined, { orderId: created.id });
    return { externalOrderId: numericId(created.id), externalOrderNumber: String(created.name ?? '').replace(/^#+/, '') };
  }

  // ─── WooCommerce ─────────────────────────────────────────

  private async wooEdit(integration: Integration, externalOrderId: string, before: SyncItem[], after: SyncItem[], customer: SyncCustomer | null): Promise<SyncResult> {
    const client = this.woo.client(integration);
    if (!client) throw new Error(apiText('WooCommerce jura nahi — pehle keys se jorein'));
    const current = await client.request<any>('GET', `/orders/${externalOrderId}`);
    const lines: any[] = Array.isArray(current?.line_items) ? current.line_items : [];
    const body: Record<string, any> = {};

    const itemsChanged = JSON.stringify(before.map((i) => [i.name, i.variant, i.quantity, i.price, i.productId, i.variantId]))
      !== JSON.stringify(after.map((i) => [i.name, i.variant, i.quantity, i.price, i.productId, i.variantId]));
    if (itemsChanged) {
      const used = new Set<number>();
      const lineItems: any[] = [];
      for (const it of after) {
        let extProduct = it.externalProductId;
        let extVariant = it.externalVariantId;
        if (!extProduct && it.productId) {
          const m = await this.prisma.productChannelMapping.findFirst({
            where: { integrationId: integration.id, productId: it.productId, variantId: it.variantId ?? null },
            select: { externalProductId: true, externalVariantId: true },
          });
          extProduct = m?.externalProductId ?? undefined;
          extVariant = m?.externalVariantId ?? undefined;
        }
        const hit = lines.find((l) => !used.has(l.id) && (
          (extVariant && String(l.variation_id) === String(extVariant))
          || (extProduct && !extVariant && String(l.product_id) === String(extProduct))
          || (it.sku && l.sku === it.sku)
        ));
        const total = String(Math.round(it.price * it.quantity * 100) / 100);
        if (hit) {
          used.add(hit.id);
          lineItems.push({ id: hit.id, quantity: it.quantity, subtotal: total, total });
        } else if (extProduct && /^\d+$/.test(String(extProduct))) {
          lineItems.push({ product_id: Number(extProduct), ...(extVariant && /^\d+$/.test(String(extVariant)) && { variation_id: Number(extVariant) }), quantity: it.quantity, subtotal: total, total });
        } else {
          lineItems.push({ name: it.variant ? `${it.name} — ${it.variant}` : it.name, quantity: it.quantity, subtotal: total, total });
        }
      }
      for (const l of lines) if (!used.has(l.id)) lineItems.push({ id: l.id, quantity: 0 });
      body.line_items = lineItems;
    }
    if (customer) {
      const { firstName, lastName } = splitName(customer.customerName ?? current?.shipping?.first_name);
      if (customer.customerName !== undefined || customer.customerAddress !== undefined || customer.customerCity !== undefined || customer.customerPhone !== undefined) {
        body.shipping = {
          ...(customer.customerName !== undefined && { first_name: firstName, last_name: lastName }),
          ...(customer.customerAddress !== undefined && { address_1: customer.customerAddress ?? '', address_2: '' }),
          ...(customer.customerCity !== undefined && { city: customer.customerCity ?? '' }),
          ...(customer.customerPhone !== undefined && { phone: customer.customerPhone ?? '' }),
        };
        if (customer.customerPhone !== undefined) body.billing = { phone: customer.customerPhone ?? '' };
      }
      if (customer.notes !== undefined) body.customer_note = customer.notes ?? '';
    }
    if (Object.keys(body).length) await client.request('PUT', `/orders/${externalOrderId}`, { body });
    await this.log(integration, 'ORDER_EDIT', true, undefined, { orderId: externalOrderId });
    return { channel: 'WOOCOMMERCE', ok: true, message: [apiText('Website order bhi badal gaya'), apiText('Delivery charge website par khud check karein')].join('. ') };
  }

  private async log(integration: Integration, operation: string, ok: boolean, error?: string, details?: any) {
    await this.prisma.syncLog.create({
      data: {
        integrationId: integration.id, tenantId: integration.tenantId, operation, direction: 'OUTBOUND',
        status: ok ? 'SUCCESS' : 'FAILED', recordsSuccess: ok ? 1 : 0, recordsFailed: ok ? 0 : 1,
        errorMessage: error?.slice(0, 500), details, completedAt: new Date(),
      },
    }).catch(() => null);
  }
}
