import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { ShopifyService } from './shopify.service';
import { phoneKey } from './customer-risk';
import { RECOVERY_DAYS, WebsiteCheckout, matchRecoveries, parseWebsiteCheckout } from './growth-math';
import { r2 } from './order-costs';

const syncKey = (integrationId: string) => `online_abandoned_sync:${integrationId}`;
/** Shopify checkouts are read again when the list opens this long after the last read. */
const SYNC_EVERY_MS = 15 * 60_000;
const LOOKBACK_DAYS = 30;

const CHECKOUTS_QUERY = (customer: boolean) => `query($first: Int!, $after: String, $query: String) {
  abandonedCheckouts(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
    nodes {
      id name createdAt updatedAt completedAt abandonedCheckoutUrl
      totalPriceSet { shopMoney { amount currencyCode } }
      ${customer ? 'customer { firstName lastName defaultPhoneNumber { phoneNumber } defaultEmailAddress { emailAddress } }' : ''}
      shippingAddress { name phone city }
      billingAddress { name phone city }
      lineItems(first: 20) { nodes { title variantTitle quantity sku originalUnitPriceSet { shopMoney { amount } } } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

/**
 * Abandoned checkouts: Shopify's list (read_orders, already granted) and
 * the custom website's `checkout.abandoned` event. The list shows each
 * checkout with its customer, items and value; staff send a WhatsApp
 * message with the recovery link and mark it contacted. A checkout counts
 * as recovered when an order from the same phone or email arrives within
 * RECOVERY_DAYS, or when the channel reports it completed.
 * WooCommerce has no abandoned-cart API in core, so it is not read.
 */
@Injectable()
export class AbandonedCartsService {
  private readonly logger = new Logger(AbandonedCartsService.name);
  private readonly running = new Set<string>();

  constructor(private readonly prisma: PrismaService, private readonly shopify: ShopifyService) {}

  // ═══ Website event ═══

  async fromWebsite(integration: Integration, body: unknown) {
    const c = parseWebsiteCheckout(body);
    if (!c) throw new BadRequestException('checkout id nahi mila');
    await this.save(integration, 'WEBSITE', c);
    return { success: true, received: 'checkout.abandoned', id: c.externalId };
  }

  private async save(integration: Integration, source: 'SHOPIFY' | 'WEBSITE', c: WebsiteCheckout, completedAt: Date | null = null) {
    const data = {
      name: c.name, customerName: c.customerName, customerPhone: c.customerPhone, phoneKey: c.phoneKey, customerEmail: c.customerEmail,
      customerCity: c.customerCity, items: c.items as unknown as Prisma.InputJsonValue, total: c.total, currency: c.currency,
      recoveryUrl: c.recoveryUrl, abandonedAt: c.abandonedAt, completedAt,
    };
    await this.prisma.abandonedCheckout.upsert({
      where: { integrationId_externalId: { integrationId: integration.id, externalId: c.externalId } },
      create: { tenantId: integration.tenantId, shopId: integration.shopId, integrationId: integration.id, externalId: c.externalId, source, ...data },
      update: data,
    });
  }

  // ═══ Shopify ═══

  /** Reads the last 30 days of Shopify abandoned checkouts into Nafaa. */
  async syncShopify(integration: Integration): Promise<{ ok: boolean; count: number; error?: string }> {
    if (this.running.has(integration.id)) return { ok: true, count: 0 };
    this.running.add(integration.id);
    try {
      const client = await this.shopify.client(integration);
      if (!client) return { ok: false, count: 0, error: 'Shopify token nahi mila — store dobara joren' };
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
      const vars = { first: 100, query: `created_at:>=${since}` };
      let nodes: any[];
      try {
        nodes = await client.paginate(CHECKOUTS_QUERY(true), 'abandonedCheckouts', vars, 5);
      } catch (e) {
        // Customer fields need protected data access; the addresses still carry name and phone.
        this.logger.warn(`Abandoned checkouts with customer ${integration.displayName}: ${(e as Error).message}`);
        nodes = await client.paginate(CHECKOUTS_QUERY(false), 'abandonedCheckouts', vars, 5);
      }
      for (const n of nodes) {
        const addr = n.shippingAddress ?? n.billingAddress ?? {};
        const phone = n.customer?.defaultPhoneNumber?.phoneNumber ?? n.shippingAddress?.phone ?? n.billingAddress?.phone ?? null;
        const name = [n.customer?.firstName, n.customer?.lastName].filter(Boolean).join(' ') || addr.name || null;
        await this.save(integration, 'SHOPIFY', {
          externalId: String(n.id).split('/').pop() ?? String(n.id),
          name: n.name ?? null,
          customerName: name,
          customerPhone: phone,
          phoneKey: phoneKey(phone),
          customerEmail: n.customer?.defaultEmailAddress?.emailAddress ?? null,
          customerCity: addr.city ?? null,
          items: (n.lineItems?.nodes ?? []).map((l: any) => ({
            name: String(l.title ?? 'Item'), quantity: Number(l.quantity) || 1, price: r2(Number(l.originalUnitPriceSet?.shopMoney?.amount) || 0),
            sku: l.sku ?? null, variant: l.variantTitle ?? null,
          })),
          total: r2(Number(n.totalPriceSet?.shopMoney?.amount) || 0),
          currency: n.totalPriceSet?.shopMoney?.currencyCode ?? null,
          recoveryUrl: n.abandonedCheckoutUrl ?? null,
          abandonedAt: new Date(n.updatedAt ?? n.createdAt),
        }, n.completedAt ? new Date(n.completedAt) : null);
      }
      return { ok: true, count: nodes.length };
    } catch (e) {
      const msg = (e as Error).message;
      this.logger.warn(`Abandoned checkouts ${integration.displayName}: ${msg}`);
      return { ok: false, count: 0, error: msg };
    } finally {
      this.running.delete(integration.id);
      // A failed read waits as long as a good one, so a broken store is not asked on every page open.
      const at = new Date().toISOString();
      await this.prisma.systemSetting.upsert({
        where: { key: syncKey(integration.id) },
        create: { key: syncKey(integration.id), value: at, category: 'online_orders', isPublic: false },
        update: { value: at },
      }).catch(() => null);
    }
  }

  private async shopifyChannels(tenantId: string) {
    const list = await this.prisma.integration.findMany({ where: { tenantId, type: 'SHOPIFY', isActive: true } });
    return list.filter((i) => this.shopify.isConnected(i));
  }

  /** Reads every connected Shopify store; `force` skips the 15 minute wait. */
  async sync(user: AuthenticatedUser, force = true) {
    const out: Array<{ channel: string; ok: boolean; count: number; error?: string }> = [];
    for (const i of await this.shopifyChannels(user.tenantId)) {
      if (!force) {
        const last = await this.prisma.systemSetting.findUnique({ where: { key: syncKey(i.id) }, select: { value: true } });
        if (last?.value && Date.now() - Date.parse(last.value) < SYNC_EVERY_MS) continue;
      }
      out.push({ channel: i.displayName, ...(await this.syncShopify(i)) });
    }
    await this.matchTenant(user.tenantId);
    return out;
  }

  // ═══ Recovery ═══

  /** Links open checkouts of the last 30 days to later orders from the same phone or email. */
  async matchTenant(tenantId: string) {
    const since = new Date(Date.now() - (LOOKBACK_DAYS + RECOVERY_DAYS) * 86_400_000);
    const carts = await this.prisma.abandonedCheckout.findMany({
      where: { tenantId, abandonedAt: { gte: since }, recoveredAt: null },
      select: { id: true, phoneKey: true, customerEmail: true, abandonedAt: true, completedAt: true },
      take: 5000,
    });
    if (!carts.length) return 0;
    const phones = [...new Set(carts.map((c) => c.phoneKey).filter(Boolean) as string[])];
    const emails = [...new Set(carts.map((c) => c.customerEmail?.toLowerCase()).filter(Boolean) as string[])];
    const ors: Prisma.ChannelOrderWhereInput[] = [
      ...phones.map((p) => ({ customerPhone: { endsWith: p } })),
      ...(emails.length ? [{ customerEmail: { in: emails, mode: 'insensitive' as const } }] : []),
    ];
    const orders = ors.length ? await this.prisma.channelOrder.findMany({
      where: { tenantId, receivedAt: { gte: since }, deletedAt: null, orderStatus: { notIn: ['CANCELLED', 'REJECTED'] }, OR: ors },
      select: { id: true, customerPhone: true, customerEmail: true, receivedAt: true, total: true },
      take: 5000,
    }) : [];
    const hits = matchRecoveries(
      carts.map((c) => ({ id: c.id, phoneKey: c.phoneKey, email: c.customerEmail, abandonedAt: c.abandonedAt, completedAt: c.completedAt })),
      orders.map((o) => ({ id: o.id, phoneKey: phoneKey(o.customerPhone), email: o.customerEmail, receivedAt: o.receivedAt, total: Number(o.total) })),
    );
    for (const [id, r] of hits) {
      await this.prisma.abandonedCheckout.update({ where: { id }, data: { recoveredOrderId: r.orderId, recoveredAt: r.at, recoveredValue: r.value } });
    }
    return hits.size;
  }

  // ═══ Screens ═══

  async list(user: AuthenticatedUser, scope: ShopScope, q: { status?: string; search?: string; days?: string }) {
    // Opening the page reads Shopify again when the last read is old.
    await this.sync(user, false).catch((e) => this.logger.warn(`Abandoned sync: ${(e as Error).message}`));
    const days = Math.min(90, Math.max(1, Number(q.days) || LOOKBACK_DAYS));
    const base: Prisma.AbandonedCheckoutWhereInput = {
      tenantId: user.tenantId,
      abandonedAt: { gte: new Date(Date.now() - days * 86_400_000) },
      ...(scope.shopId ? { OR: [{ shopId: scope.shopId }, { shopId: null }] } : {}),
    };
    const term = String(q.search ?? '').trim();
    const digits = term.replace(/\D/g, '');
    const where: Prisma.AbandonedCheckoutWhereInput = {
      ...base,
      ...(q.status === 'OPEN' ? { recoveredAt: null, contactedAt: null }
        : q.status === 'CONTACTED' ? { recoveredAt: null, contactedAt: { not: null } }
          : q.status === 'RECOVERED' ? { recoveredAt: { not: null } } : {}),
      ...(term ? {
        AND: [{
          OR: [
            { customerName: { contains: term, mode: 'insensitive' } },
            { customerEmail: { contains: term, mode: 'insensitive' } },
            ...(digits.length >= 4 ? [{ customerPhone: { contains: digits.slice(-10) } }] : []),
          ],
        }],
      } : {}),
    };
    const [rows, all, channels] = await Promise.all([
      this.prisma.abandonedCheckout.findMany({ where, orderBy: { abandonedAt: 'desc' }, take: 300 }),
      this.prisma.abandonedCheckout.findMany({ where: base, select: { total: true, contactedAt: true, recoveredAt: true, recoveredValue: true } }),
      this.prisma.integration.findMany({ where: { tenantId: user.tenantId, type: { in: ['SHOPIFY', 'WOOCOMMERCE', 'CUSTOM_WEBSITE'] } }, select: { id: true, type: true, displayName: true, credentials: true, config: true } }),
    ]);
    const recovered = all.filter((c) => c.recoveredAt);
    const contacted = all.filter((c) => c.contactedAt);
    const names = new Map(channels.map((c) => [c.id, c.displayName]));
    const orderIds = rows.map((r) => r.recoveredOrderId).filter(Boolean) as string[];
    const orders = orderIds.length ? await this.prisma.channelOrder.findMany({ where: { id: { in: orderIds } }, select: { id: true, externalOrderNumber: true, externalOrderId: true } }) : [];
    const orderNo = new Map(orders.map((o) => [o.id, String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '')]));
    return {
      days,
      stats: {
        carts: all.length,
        value: r2(all.reduce((s, c) => s + c.total, 0)),
        contacted: contacted.length,
        recovered: recovered.length,
        recoveredValue: r2(recovered.reduce((s, c) => s + (c.recoveredValue ?? 0), 0)),
        recoveredAfterContact: recovered.filter((c) => c.contactedAt && c.contactedAt <= c.recoveredAt!).length,
        rate: all.length ? Math.round((recovered.length / all.length) * 1000) / 10 : 0,
      },
      sources: {
        shopify: channels.filter((c) => c.type === 'SHOPIFY').map((c) => ({ id: c.id, name: c.displayName, connected: !!(c.credentials as any)?.shopifyToken })),
        woocommerce: channels.filter((c) => c.type === 'WOOCOMMERCE' || (c.config as any)?.platform === 'woocommerce').map((c) => ({ id: c.id, name: c.displayName })),
        website: channels.filter((c) => c.type === 'CUSTOM_WEBSITE' && (c.config as any)?.platform !== 'woocommerce').map((c) => ({ id: c.id, name: c.displayName })),
      },
      items: rows.map((r) => ({
        id: r.id, source: r.source, channel: names.get(r.integrationId) ?? null, integrationId: r.integrationId, name: r.name,
        customerName: r.customerName, customerPhone: r.customerPhone, customerEmail: r.customerEmail, customerCity: r.customerCity,
        items: r.items, total: r.total, currency: r.currency, recoveryUrl: r.recoveryUrl, abandonedAt: r.abandonedAt,
        contactedAt: r.contactedAt, contactCount: r.contactCount, recoveredAt: r.recoveredAt, recoveredValue: r.recoveredValue,
        recoveredOrderId: r.recoveredOrderId, recoveredOrderNo: r.recoveredOrderId ? orderNo.get(r.recoveredOrderId) ?? null : null,
      })),
    };
  }

  async markContacted(user: AuthenticatedUser, id: string, undo = false) {
    const row = await this.prisma.abandonedCheckout.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!row) throw new NotFoundException('Cart nahi mila');
    return this.prisma.abandonedCheckout.update({
      where: { id },
      data: undo ? { contactedAt: null, contactedById: null, contactCount: 0 }
        : { contactedAt: new Date(), contactedById: user.id, contactCount: { increment: 1 } },
      select: { id: true, contactedAt: true, contactCount: true },
    });
  }
}
