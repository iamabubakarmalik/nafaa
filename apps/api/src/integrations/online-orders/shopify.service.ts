import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { WebsiteCatalogService } from './website-catalog.service';
import { WebsiteSetupService } from './website-setup.service';
import { readWebsiteConfig } from './website-config';
import { SHOPIFY_SCOPES, ShopifyClient, ShopifyError, numericId, orderGid } from './shopify.client';
import { mappingKey } from './mapping-key';

/**
 * Shopify — ek click me jorna (OAuth, "legacy install flow"):
 *
 *  1. Dukandar store ka naam daalta hai → popup me Shopify (login + Install)
 *  2. Shopify hamare /integrations/shopify/callback par `code` bhejta hai
 *  3. HMAC + state check → code se access token → encrypt karke rakhna
 *  4. Webhooks khud register (order bana/badla/cancel/paid, app uninstall)
 *
 * Us ke baad GraphQL se: fulfillment + tracking, stock (location ke saath),
 * products dono taraf. App hatne par channel khud band.
 */

const WEBHOOK_TOPICS = ['ORDERS_CREATE', 'ORDERS_UPDATED', 'ORDERS_CANCELLED', 'ORDERS_PAID', 'APP_UNINSTALLED'] as const;

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: WebsiteCatalogService,
    private readonly setup: WebsiteSetupService,
  ) {}

  private clientId() { return process.env.SHOPIFY_CLIENT_ID ?? ''; }
  private clientSecret() { return process.env.SHOPIFY_CLIENT_SECRET ?? ''; }

  /** Server par Shopify app ki keys lagi hain? */
  configured() {
    return !!this.clientId() && !!this.clientSecret();
  }

  // ═══════════════════════════════════════════════════════════
  // CONNECT — popup ka URL
  // ═══════════════════════════════════════════════════════════

  normalizeShop(raw: string): string {
    let s = String(raw ?? '').trim().toLowerCase();
    if (!s) throw new BadRequestException('Shopify store ka naam daalein — jaise nafaa-test');
    // admin.shopify.com/store/nafaa-test → nafaa-test
    const admin = s.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/);
    if (admin) s = admin[1];
    s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!s.endsWith('.myshopify.com')) s = `${s.replace(/\.myshopify\.com$/, '')}.myshopify.com`;
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) {
      throw new BadRequestException('Store ka naam sahi nahi — Shopify admin ke URL wala naam daalein (jaise nafaa-test)');
    }
    return s;
  }

  async start(user: AuthenticatedUser, body: { shop: string; displayName?: string; shopId?: string; channelId?: string; returnOrigin?: string }) {
    this.setup.assertCanManage(user);
    if (!this.configured()) {
      throw new BadRequestException('Shopify app ki keys server par nahi lagi (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET)');
    }
    const shop = this.normalizeShop(body.shop);

    let integration: Integration;
    if (body.channelId) {
      integration = await this.setup.requireChannel(user.tenantId, body.channelId);
    } else {
      const same = (await this.prisma.integration.findMany({ where: { tenantId: user.tenantId, type: 'SHOPIFY' } }))
        .find((i) => readWebsiteConfig(i.config).siteUrl === `https://${shop}` && i.apiKey);
      integration = same ?? await this.setup.createChannel(user, {
        type: 'SHOPIFY',
        displayName: body.displayName?.trim() || shop.replace('.myshopify.com', ''),
        shopId: body.shopId,
        siteUrl: `https://${shop}`,
        status: IntegrationStatus.PENDING,
      });
    }
    const cfg = readWebsiteConfig(integration.config);
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { config: { ...cfg, platform: 'shopify', siteUrl: `https://${shop}` } as any },
    });

    const pub = this.setup.publicApi();
    if (!pub.reachable) {
      return { channelId: integration.id, authUrl: null, needsHttps: true, reason: pub.reason, fix: pub.fix };
    }

    const params = new URLSearchParams({
      client_id: this.clientId(),
      scope: SHOPIFY_SCOPES,
      redirect_uri: this.redirectUri(),
      state: this.signState(integration.id, this.webOrigin(body.returnOrigin)),
    });
    return {
      channelId: integration.id,
      authUrl: `https://${shop}/admin/oauth/authorize?${params.toString()}` as string | null,
      needsHttps: false,
      reason: null as string | null,
      fix: null as string | null,
    };
  }

  /** Dev dashboard ke "Allowed redirection URL(s)" se bilkul milna chahiye */
  redirectUri() {
    return (process.env.SHOPIFY_REDIRECT_URI || `${this.setup.apiBase()}/integrations/shopify/callback`).trim();
  }

  /**
   * Shopify yahan wapas aata hai (popup ke andar). Jawab hamesha web ke
   * done-safhe par redirect hai — kamyabi ho ya na ho.
   */
  async callback(query: Record<string, string>): Promise<string> {
    let web = this.webOrigin();
    let channelId = '';
    try {
      const { id, origin } = this.verifyState(String(query.state ?? ''));
      channelId = id;
      web = origin;
      if (!this.verifyQueryHmac(query)) throw new UnauthorizedException('Shopify ka signature match nahi hua');
      const shop = this.normalizeShop(String(query.shop ?? ''));
      if (!query.code) throw new BadRequestException(query.error_description || 'Install cancel hua');

      const integration = await this.prisma.integration.findUniqueOrThrow({ where: { id } });
      const expected = readWebsiteConfig(integration.config).siteUrl;
      if (expected && expected !== `https://${shop}`) {
        throw new BadRequestException(`Ye install ${shop} ka hai, jabke Nafaa ${expected.replace('https://', '')} ka intezar kar raha tha`);
      }

      // code → access token
      const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        // Shopify ab sirf "expiring offline token" maanta hai: 1 ghanta ka
        // access token + 90 din ka refresh token (har refresh par naya).
        body: JSON.stringify({ client_id: this.clientId(), client_secret: this.clientSecret(), code: query.code, expiring: 1 }),
      });
      const tok: any = await res.json().catch(() => null);
      if (!res.ok || !tok?.access_token) throw new BadRequestException(tok?.error_description ?? 'Shopify se token nahi mila');

      const cfg = readWebsiteConfig(integration.config);
      await this.prisma.integration.update({
        where: { id },
        data: {
          credentials: {
            ...this.tokenFields(tok),
            shopifyScopes: tok.scope ?? SHOPIFY_SCOPES,
            shopifyShop: shop,
            shopifyConnectedAt: new Date().toISOString(),
          },
          config: { ...cfg, platform: 'shopify', siteUrl: `https://${shop}`, shopifySecret: null } as any,
          status: IntegrationStatus.CONNECTED,
          isActive: true,
        },
      });

      setTimeout(() => this.afterConnect(id).catch((e) => this.logger.warn(`Shopify setup fail: ${e?.message}`)), 300);
      return `${web}/connect/shopify/done?channel=${id}&success=1`;
    } catch (e: any) {
      this.logger.warn(`Shopify callback: ${e?.message}`);
      const msg = encodeURIComponent(String(e?.response?.message ?? e?.message ?? 'Masla hua').slice(0, 200));
      return `${web}/connect/shopify/done?channel=${channelId}&success=0&error=${msg}`;
    }
  }

  /** Webhooks, store ka naam, location, pehla stock sync */
  async afterConnect(id: string) {
    const integration = await this.prisma.integration.findUniqueOrThrow({ where: { id } });
    const client = await this.mustClient(integration);

    // Pehle seedha check: token zinda hai? kaunse scopes mile? — Activity me saaf likha aaye
    const check = await client.accessScopes();
    const creds = (integration.credentials ?? {}) as any;
    const tokenLooksEncrypted = typeof creds.shopifyToken === 'string' && creds.shopifyToken.split(':').length === 3;
    await this.log(integration, 'SHOPIFY_TOKEN_CHECK', check.status === 200, check.error
      ? `${check.error} · status ${check.status} · token ${tokenLooksEncrypted ? 'encrypted' : 'plain'} · api ${process.env.SHOPIFY_API_VERSION || 'default'}`
      : undefined, { status: check.status, scopes: check.scopes });
    if (check.status !== 200) return;

    // Store ka naam + stock wali location
    try {
      const data = await client.graphql<any>(`{
        shop { name }
        locations(first: 20) { nodes { id name isActive fulfillsOnlineOrders } }
      }`);
      const locs: any[] = data?.locations?.nodes ?? [];
      const loc = locs.find((l) => l.isActive && l.fulfillsOnlineOrders) ?? locs.find((l) => l.isActive) ?? locs[0];
      const cfg = readWebsiteConfig(integration.config) as any;
      const shopDomain = (integration.credentials as any)?.shopifyShop ?? '';
      const defaultName = !integration.displayName || integration.displayName === shopDomain.replace('.myshopify.com', '');
      await this.prisma.integration.update({
        where: { id },
        data: {
          config: { ...cfg, shopifyLocationId: loc?.id ?? null, shopifyLocationName: loc?.name ?? null } as any,
          ...(defaultName && data?.shop?.name && { displayName: String(data.shop.name).slice(0, 80) }),
        },
      });
    } catch (e: any) {
      await this.log(integration, 'SHOPIFY_SHOP_INFO', false, e?.message);
    }

    const res = await this.installWebhooks(integration);
    await this.log(integration, 'SHOPIFY_CONNECT', res.ok, res.error, { installed: res.installed });
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id } });
    this.syncStock(fresh).catch(() => null);
  }

  async installWebhooks(integration: Integration) {
    const client = await this.client(integration);
    const hook = this.setup.urls(integration.apiKey).hook;
    if (!client || !hook) return { ok: false, installed: 0, error: 'Shopify jura nahi' };
    try {
      const existing = await client.paginate<any>(`query($after: String) {
        webhookSubscriptions(first: 100, after: $after) {
          nodes { id topic endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } }
          pageInfo { hasNextPage endCursor }
        }
      }`, 'webhookSubscriptions', {}, 5);

      let installed = 0;
      for (const topic of WEBHOOK_TOPICS) {
        const mine = existing.filter((w) => w.topic === topic && String(w.endpoint?.callbackUrl ?? '').includes('/integrations/website/v1/hook/'));
        const current = mine.find((w) => w.endpoint?.callbackUrl === hook);
        for (const w of mine) {
          if (w === current) continue;
          await client.mutate(`mutation($id: ID!) { webhookSubscriptionDelete(id: $id) { deletedWebhookSubscriptionId userErrors { field message } } }`,
            { id: w.id }, 'webhookSubscriptionDelete').catch(() => null);
        }
        if (current) continue;
        await client.mutate(`mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) { webhookSubscription { id } userErrors { field message } }
        }`, { topic, sub: { callbackUrl: hook, format: 'JSON' } }, 'webhookSubscriptionCreate');
        installed++;
      }
      await this.prisma.integration.update({ where: { id: integration.id }, data: { webhookVerified: true } });
      return { ok: true, installed };
    } catch (e: any) {
      return { ok: false, installed: 0, error: e?.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // WEBHOOKS jo order nahi hain
  // ═══════════════════════════════════════════════════════════

  /** Dukandar ne Shopify se app hata di — channel band, token mitao */
  async onUninstalled(integration: Integration) {
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { status: IntegrationStatus.DISCONNECTED, isActive: false, credentials: Prisma.JsonNull as any, webhookVerified: false },
    });
    await this.log(integration, 'SHOPIFY_UNINSTALLED', true);
  }

  /** Shopify ke lazmi GDPR webhooks (app config me compliance URL) */
  async compliance(topic: string, rawBody: Buffer | undefined, hmacHeader: string | undefined, body: any) {
    if (!rawBody || !hmacHeader || !this.clientSecret()) throw new UnauthorizedException('signature nahi');
    const expected = crypto.createHmac('sha256', this.clientSecret()).update(rawBody).digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(hmacHeader);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new UnauthorizedException('signature ghalat');

    const shop = String(body?.shop_domain ?? '').toLowerCase();
    const channels = (await this.prisma.integration.findMany({ where: { type: 'SHOPIFY' } }))
      .filter((i) => readWebsiteConfig(i.config).siteUrl === `https://${shop}`);

    for (const ch of channels) {
      if (topic === 'customers/redact') {
        // Us customer ke orders ki shakhsi maloomat mita do (bill ka hisaab rehta hai)
        const ids: string[] = (body?.orders_to_redact ?? []).map((x: any) => String(x));
        const email = body?.customer?.email ? String(body.customer.email) : null;
        const phone = body?.customer?.phone ? String(body.customer.phone) : null;
        const or: Prisma.ChannelOrderWhereInput[] = [];
        if (ids.length) or.push({ externalOrderId: { in: ids } });
        if (email) or.push({ customerEmail: email });
        if (phone) or.push({ customerPhone: phone });
        if (or.length) {
          await this.prisma.channelOrder.updateMany({
            where: { integrationId: ch.id, OR: or },
            data: { customerName: 'Redacted', customerEmail: null, customerPhone: null, customerAddress: null, customerLat: null, customerLng: null },
          });
        }
      } else if (topic === 'shop/redact') {
        await this.prisma.channelOrder.updateMany({
          where: { integrationId: ch.id },
          data: { customerName: 'Redacted', customerEmail: null, customerPhone: null, customerAddress: null, customerLat: null, customerLng: null },
        });
        await this.prisma.integration.update({ where: { id: ch.id }, data: { credentials: Prisma.JsonNull as any, isActive: false, status: IntegrationStatus.DISCONNECTED } });
      }
      // customers/data_request: hum sirf orders ka data rakhte hain jo dukandar ke paas Nafaa me hai — log kar do
      await this.log(ch, `SHOPIFY_GDPR:${topic}`, true, undefined, { shop });
    }
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS — Nafaa → Shopify order
  // ═══════════════════════════════════════════════════════════

  isConnected(integration: Integration) {
    return integration.type === 'SHOPIFY' && !!(integration.credentials as any)?.shopifyToken;
  }

  async pushStatus(integration: Integration, order: any, event: string) {
    const client = await this.client(integration);
    if (!client || !/^\d+$/.test(String(order.externalOrderId))) return;
    const id = orderGid(order.externalOrderId);
    const status: string = order.orderStatus;
    let ok = true;
    let error: string | undefined;
    try {
      if (event === 'order.paid' || (status === 'DELIVERED' && order.paymentStatus === 'PAID')) {
        await this.markPaid(client, id).catch(() => null);
      }
      if (status === 'CONFIRMED') {
        await this.tag(client, id, ['Nafaa: Accepted']);
      } else if (status === 'PREPARING' || status === 'READY') {
        await this.tag(client, id, [status === 'READY' ? 'Nafaa: Packed' : 'Nafaa: Packing']);
      } else if (status === 'OUT_FOR_DELIVERY') {
        await this.fulfill(client, id, order.courierName, order.trackingNumber);
      } else if (status === 'DELIVERED') {
        const fulfillmentId = await this.fulfill(client, id, order.courierName, order.trackingNumber);
        if (fulfillmentId) {
          await client.mutate(`mutation($e: FulfillmentEventInput!) { fulfillmentEventCreate(fulfillmentEvent: $e) { fulfillmentEvent { id } userErrors { field message } } }`,
            { e: { fulfillmentId, status: 'DELIVERED' } }, 'fulfillmentEventCreate').catch(() => null);
        }
      } else if (status === 'CANCELLED' || status === 'REJECTED') {
        await client.mutate(`mutation($id: ID!, $note: String) {
          orderCancel(orderId: $id, reason: OTHER, refund: false, restock: true, notifyCustomer: false, staffNote: $note) {
            job { id } orderCancelUserErrors { field message }
          }
        }`, { id, note: `Nafaa: ${order.cancelReason ?? 'cancel'}` }, 'orderCancel').catch(async (e) => {
          // Pehle se cancel/fulfilled ho to kam az kam tag
          await this.tag(client, id, ['Nafaa: Cancelled']);
          throw e;
        });
      }
    } catch (e: any) {
      ok = false;
      error = e?.message;
    }
    await this.log(integration, `STATUS_PUSH:${status}`, ok, error, { orderId: order.externalOrderId });

    if (['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(status)) {
      const skus = ((order.items as any[]) ?? []).map((i) => i?.sku).filter(Boolean);
      if (skus.length) this.syncStock(integration, { onlySkus: skus }).catch(() => null);
    }
  }

  private async tag(client: ShopifyClient, id: string, tags: string[]) {
    await client.mutate(`mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { node { id } userErrors { field message } } }`,
      { id, tags }, 'tagsAdd');
  }

  private async markPaid(client: ShopifyClient, id: string) {
    const data = await client.graphql<any>(`query($id: ID!) { order(id: $id) { displayFinancialStatus } }`, { id });
    if (['PAID', 'REFUNDED', 'VOIDED'].includes(data?.order?.displayFinancialStatus)) return;
    await client.mutate(`mutation($input: OrderMarkAsPaidInput!) { orderMarkAsPaid(input: $input) { order { id } userErrors { field message } } }`,
      { input: { id } }, 'orderMarkAsPaid');
  }

  /** Order ke khule fulfillment orders poore karo (tracking ke saath). Pehle se ho to wahi fulfillment id */
  private async fulfill(client: ShopifyClient, id: string, company?: string | null, number?: string | null): Promise<string | null> {
    const data = await client.graphql<any>(`query($id: ID!) {
      order(id: $id) {
        fulfillments(first: 5) { id status }
        fulfillmentOrders(first: 10) { nodes { id status } }
      }
    }`, { id });
    const open = (data?.order?.fulfillmentOrders?.nodes ?? []).filter((f: any) => ['OPEN', 'IN_PROGRESS'].includes(f.status));
    if (!open.length) {
      const done = (data?.order?.fulfillments ?? []).find((f: any) => f.status === 'SUCCESS');
      return done?.id ?? null;
    }
    const res = await client.mutate<any>(`mutation($f: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $f) { fulfillment { id } userErrors { field message } }
    }`, {
      f: {
        lineItemsByFulfillmentOrder: open.map((f: any) => ({ fulfillmentOrderId: f.id })),
        notifyCustomer: true,
        ...((company || number) && { trackingInfo: { company: company || undefined, number: number || undefined } }),
      },
    }, 'fulfillmentCreate');
    return res?.fulfillment?.id ?? null;
  }

  // ═══════════════════════════════════════════════════════════
  // STOCK — Nafaa → Shopify (har 15 minute + accept/cancel par)
  // ═══════════════════════════════════════════════════════════

  @Cron('30 */15 * * * *')
  async syncAll() {
    if (this.running || process.env.DISABLE_SHOPIFY_SYNC === '1') return;
    this.running = true;
    try {
      const list = await this.prisma.integration.findMany({ where: { type: 'SHOPIFY', isActive: true, status: IntegrationStatus.CONNECTED } });
      for (const i of list) {
        if (!this.isConnected(i)) continue;
        await this.syncStock(i).catch((e) => this.logger.warn(`Shopify stock sync ${i.displayName}: ${e?.message}`));
      }
    } finally {
      this.running = false;
    }
  }

  async syncStock(integration: Integration, opts: { onlySkus?: string[] } = {}) {
    const client = await this.mustClient(integration);
    const cfg = readWebsiteConfig(integration.config) as any;
    const locationId: string | null = cfg.shopifyLocationId;
    if (!locationId) throw new BadRequestException('Shopify location nahi mili — "Webhooks check" dabayein');

    const q = opts.onlySkus?.length
      ? [...new Set(opts.onlySkus)].slice(0, 50).map((s) => `sku:${JSON.stringify(s)}`).join(' OR ')
      : null;
    const variants = await client.paginate<any>(`query($after: String, $q: String, $loc: ID!) {
      productVariants(first: 250, after: $after, query: $q) {
        nodes {
          id sku
          inventoryItem { id tracked inventoryLevel(locationId: $loc) { quantities(names: ["available"]) { quantity } } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`, 'productVariants', { q, loc: locationId }, 20);

    // Pehle jore hue variants (link), phir SKU — stock ka malik Nafaa
    const linkStock = await this.catalog.stockByLink(integration);
    const rows = variants.filter((v) => v.inventoryItem?.id && (v.sku || linkStock.has(numericId(v.id))));
    const skus = [...new Set(rows.filter((r) => !linkStock.has(numericId(r.id))).map((r) => String(r.sku)).filter(Boolean))];
    if (!rows.length) {
      await this.log(integration, 'STOCK_SYNC', true, undefined, { updated: 0, note: 'Koi variant jora hua nahi, na SKU mila' });
      return { updated: 0, checked: 0, missing: 0 };
    }
    const stock = skus.length ? await this.catalog.stockBySku(integration.tenantId, cfg.shopId ?? integration.shopId, integration.id, skus) : {};

    const changes: { inventoryItemId: string; locationId: string; quantity: number; changeFromQuantity: number | null }[] = [];
    let missing = 0;
    for (const r of rows) {
      const want = linkStock.get(numericId(r.id)) ?? (r.sku ? stock[String(r.sku)] : undefined);
      if (want === undefined) { missing++; continue; }
      const qty = Math.max(0, Math.floor(want));
      const current = r.inventoryItem.inventoryLevel?.quantities?.[0]?.quantity;
      if (current === qty && r.inventoryItem.tracked) continue;
      if (!r.inventoryItem.tracked) {
        await client.mutate(`mutation($id: ID!) { inventoryItemUpdate(id: $id, input: { tracked: true }) { inventoryItem { id } userErrors { field message } } }`,
          { id: r.inventoryItem.id }, 'inventoryItemUpdate').catch(() => null);
      }
      changes.push({ inventoryItemId: r.inventoryItem.id, locationId, quantity: qty, changeFromQuantity: current ?? null });
    }

    let updated = 0;
    for (let i = 0; i < changes.length; i += 100) {
      const chunk = changes.slice(i, i + 100);
      await client.mutate(`mutation($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) { inventoryAdjustmentGroup { id } userErrors { field message } }
      }`, { input: { name: 'available', reason: 'correction', referenceDocumentUri: 'nafaa://stock-sync', quantities: chunk } }, 'inventorySetQuantities');
      updated += chunk.length;
    }

    await this.prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date(), lastSyncStatus: 'SUCCESS' } });
    await this.log(integration, 'STOCK_SYNC', true, undefined, { updated, checked: rows.length, missing });
    return { updated, checked: rows.length, missing };
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCTS — dono taraf
  // ═══════════════════════════════════════════════════════════

  /** Shopify → Nafaa. Kai variants wale product ka har variant alag product (SKU se order match hota hai) */
  async importFromShopify(user: AuthenticatedUser, channelId: string, opts: { updatePrice?: boolean; updateStock?: boolean }) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const client = await this.mustClient(integration);
    const products = await client.paginate<any>(`query($after: String) {
      products(first: 50, after: $after, query: "status:active") {
        nodes {
          id title description productType
          media(first: 5) { nodes { ... on MediaImage { image { url } } } }
          variants(first: 100) { nodes { id sku barcode price title inventoryQuantity } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`, 'products', {}, 40);

    const rows: any[] = [];
    for (const p of products) {
      const images = (p.media?.nodes ?? []).map((m: any) => m?.image?.url).filter(Boolean);
      const vars: any[] = p.variants?.nodes ?? [];
      const single = vars.length <= 1 || vars[0]?.title === 'Default Title';
      for (const v of single ? vars.slice(0, 1) : vars) {
        rows.push({
          id: numericId(v.id),
          name: single ? p.title : `${p.title} - ${v.title}`,
          sku: v.sku || undefined,
          barcode: v.barcode || undefined,
          price: v.price,
          stock: v.inventoryQuantity,
          description: p.description || undefined,
          category: p.productType || undefined,
          images,
        });
      }
    }
    const cfg = readWebsiteConfig(integration.config);
    const res = await this.catalog.importProducts(integration, rows, {
      shopId: cfg.shopId ?? integration.shopId,
      updatePrice: !!opts.updatePrice,
      updateStock: !!opts.updateStock,
    });
    await this.log(integration, 'PRODUCTS_IMPORT', true, undefined, { imported: res.imported, updated: res.updated });
    return res;
  }

  /** Nafaa → Shopify: jo SKU Shopify par nahi, wo naye products ban jayen (variants ke saath) */
  async exportToShopify(user: AuthenticatedUser, channelId: string, opts: { updatePrice?: boolean; productIds?: string[] }) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const client = await this.mustClient(integration);
    const cfg = readWebsiteConfig(integration.config) as any;
    const locationId: string | null = cfg.shopifyLocationId;

    const [all, existing] = await Promise.all([
      this.catalog.exportAll(integration.tenantId, cfg.shopId ?? integration.shopId),
      client.paginate<any>(`query($after: String) {
        productVariants(first: 250, after: $after) { nodes { id sku price product { id } } pageInfo { hasNextPage endCursor } }
      }`, 'productVariants', {}, 40),
    ]);
    const nafaa = opts.productIds?.length ? all.filter((p) => opts.productIds!.includes(p.id)) : all;
    const bySku = new Map(existing.filter((v) => v.sku).map((v) => [String(v.sku), v]));

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const p of nafaa) {
      const sku = p.sku || `NF-${p.id.slice(0, 8)}`;
      const found = bySku.get(sku) ?? p.variants.map((v: any) => v.sku && bySku.get(v.sku)).find(Boolean);
      if (found) {
        await this.link(integration.id, p.id, numericId(found.product.id), sku, null, numericId(found.id), p.name);
        if (opts.updatePrice && !p.variants.length && Number(found.price) !== Number(p.price)) {
          await client.mutate(`mutation($pid: ID!, $v: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $pid, variants: $v) { productVariants { id } userErrors { field message } }
          }`, { pid: found.product.id, v: [{ id: found.id, price: String(p.price) }] }, 'productVariantsBulkUpdate')
            .then(() => { updated++; }).catch(() => { failed++; });
        }
        continue;
      }

      const hasVariants = p.variants.length > 0;
      const optionName = hasVariants ? 'Option' : 'Title';
      const variants = (hasVariants ? p.variants : [{ name: 'Default Title', sku, price: p.price, stock: p.stock }]).map((v: any) => ({
        optionValues: [{ optionName, name: v.name }],
        price: String(v.price),
        inventoryItem: { sku: v.sku || (hasVariants ? undefined : sku), tracked: true },
        ...(locationId && { inventoryQuantities: [{ locationId, name: 'available', quantity: Math.max(0, Math.floor(v.stock ?? 0)) }] }),
      }));

      try {
        const res = await client.mutate<any>(`mutation($input: ProductSetInput!) {
          productSet(synchronous: true, input: $input) { product { id variants(first: 100) { nodes { id sku title } } } userErrors { field message } }
        }`, {
          input: {
            title: p.name,
            descriptionHtml: p.description ?? '',
            productType: p.category ?? '',
            status: 'ACTIVE',
            productOptions: [{ name: optionName, values: (hasVariants ? p.variants : [{ name: 'Default Title' }]).map((v: any) => ({ name: v.name })) }],
            variants,
            files: p.images.slice(0, 5).map((src: string) => ({ originalSource: src, contentType: 'IMAGE' })),
          },
        }, 'productSet');
        if (res?.product?.id) {
          const made: any[] = res.product.variants?.nodes ?? [];
          if (hasVariants) {
            // Har Nafaa variant apne Shopify variant se (SKU, warna naam se)
            for (const v of p.variants) {
              const sv = made.find((m) => (v.sku && m.sku === v.sku) || m.title === v.name);
              if (sv) await this.link(integration.id, p.id, numericId(res.product.id), v.sku ?? undefined, v.id, numericId(sv.id), `${p.name} — ${v.name}`);
            }
          } else {
            await this.link(integration.id, p.id, numericId(res.product.id), sku, null, made[0] ? numericId(made[0].id) : null, p.name);
          }
        }
        created++;
      } catch (e: any) {
        failed++;
        if (errors.length < 10) errors.push(`${p.name}: ${e.message}`);
      }
    }

    await this.log(integration, 'PRODUCTS_EXPORT', failed === 0, errors[0], { created, updated, failed });
    return { created, updated, failed, total: nafaa.length, errors };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  /** Token ke DB fields (encrypted) — pehli dafa aur har refresh par */
  private tokenFields(tok: any) {
    const now = Date.now();
    return {
      shopifyToken: encrypt(tok.access_token),
      shopifyRefreshToken: tok.refresh_token ? encrypt(tok.refresh_token) : null,
      shopifyTokenExpiresAt: tok.expires_in ? new Date(now + Number(tok.expires_in) * 1000).toISOString() : null,
      shopifyRefreshExpiresAt: tok.refresh_token_expires_in
        ? new Date(now + Number(tok.refresh_token_expires_in) * 1000).toISOString()
        : null,
      shopifyReauth: false,
    };
  }

  /** Ek channel ka ek hi refresh ek waqt me — do refresh ek hi refresh token kha na jayen */
  private refreshing = new Map<string, Promise<string | null>>();

  /**
   * Chalta hua access token. Expiry se 5 minute pehle khud refresh karta hai.
   * Refresh token bhi mar gaya ho (90 din / app hata di) to null — "Dobara install".
   */
  private async accessToken(integration: Integration): Promise<string | null> {
    const c = (integration.credentials ?? {}) as any;
    if (!c.shopifyToken || !c.shopifyShop) return null;
    const exp = c.shopifyTokenExpiresAt ? new Date(c.shopifyTokenExpiresAt).getTime() : null;
    // Purana (non-expiring) token ya abhi zinda token
    if (!exp || exp - Date.now() > 5 * 60_000) return decrypt(c.shopifyToken);
    if (!c.shopifyRefreshToken) return decrypt(c.shopifyToken);

    const running = this.refreshing.get(integration.id);
    if (running) return running;
    const job = this.refresh(integration).finally(() => this.refreshing.delete(integration.id));
    this.refreshing.set(integration.id, job);
    return job;
  }

  private async refresh(integration: Integration): Promise<string | null> {
    // Taaza row — ho sakta hai kisi aur request ne abhi refresh kiya ho
    const fresh = await this.prisma.integration.findUnique({ where: { id: integration.id } });
    const c = (fresh?.credentials ?? {}) as any;
    const exp = c.shopifyTokenExpiresAt ? new Date(c.shopifyTokenExpiresAt).getTime() : 0;
    if (exp - Date.now() > 5 * 60_000) return decrypt(c.shopifyToken);

    const res = await fetch(`https://${c.shopifyShop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId(),
        client_secret: this.clientSecret(),
        grant_type: 'refresh_token',
        refresh_token: decrypt(c.shopifyRefreshToken),
      }),
    }).catch(() => null);
    const tok: any = res ? await res.json().catch(() => null) : null;

    if (!res || !res.ok || !tok?.access_token) {
      const terminal = res?.status === 401 || res?.status === 400;
      if (terminal) {
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: { credentials: { ...c, shopifyReauth: true }, status: IntegrationStatus.ERROR },
        });
      }
      await this.log(integration, 'SHOPIFY_TOKEN_REFRESH', false,
        terminal ? 'Shopify ne dobara ijazat maangi — channel page par "Dobara install" dabayein' : `Refresh nahi hua (${res?.status ?? 'network'})`);
      return null;
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        credentials: { ...c, ...this.tokenFields({ ...tok, refresh_token: tok.refresh_token ?? decrypt(c.shopifyRefreshToken) }) },
        status: IntegrationStatus.CONNECTED,
      },
    });
    return tok.access_token as string;
  }

  async client(integration: Integration): Promise<ShopifyClient | null> {
    const shop = (integration.credentials as any)?.shopifyShop;
    const token = await this.accessToken(integration);
    if (!token || !shop) return null;
    return new ShopifyClient(shop, token);
  }

  private async mustClient(integration: Integration) {
    const c = await this.client(integration);
    if (!c) {
      throw new BadRequestException((integration.credentials as any)?.shopifyReauth
        ? 'Shopify ne dobara ijazat maangi — "Dobara install" dabayein'
        : 'Shopify jura nahi — pehle "Shopify se jorein" dabayein');
    }
    return c;
  }

  private async link(integrationId: string, productId: string, externalId: string, sku?: string, variantId?: string | null, externalVariantId?: string | null, title?: string) {
    const linkKey = mappingKey(productId, variantId);
    await this.prisma.productChannelMapping.upsert({
      where: { integrationId_linkKey: { integrationId, linkKey } },
      create: {
        integrationId, linkKey, productId, variantId: variantId ?? null,
        externalProductId: externalId, externalVariantId: externalVariantId ?? null, externalSku: sku, externalTitle: title ?? null,
        syncStatus: 'SUCCESS', lastSyncedAt: new Date(),
      },
      update: { externalProductId: externalId, externalVariantId: externalVariantId ?? null, externalSku: sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
    }).catch(() => null);
  }

  /** Shopify query-string HMAC (hex) — hmac ke ilawa sab params, sorted */
  verifyQueryHmac(query: Record<string, string>) {
    const { hmac, signature, ...rest } = query;
    if (!hmac || !this.clientSecret()) return false;
    const message = Object.keys(rest).sort().map((k) => `${k}=${Array.isArray(rest[k]) ? (rest[k] as any).join(',') : rest[k]}`).join('&');
    const expected = crypto.createHmac('sha256', this.clientSecret()).update(message).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(hmac));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  private webOrigin(requested?: string) {
    const fallback = (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
    if (!requested) return fallback;
    try {
      const u = new URL(requested);
      const ok = /(^|\.)nafaa\.pk$/.test(u.hostname) || (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(u.hostname));
      return ok ? u.origin : fallback;
    } catch {
      return fallback;
    }
  }

  private secret() {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-state';
  }

  /** state = id.exp.origin(base64url).sig — Shopify isay jaisa ka taisa wapas deta hai */
  private signState(id: string, origin: string) {
    const exp = Date.now() + 30 * 60_000;
    const o = Buffer.from(origin).toString('base64url');
    const payload = `${id}.${exp}.${o}`;
    const sig = crypto.createHmac('sha256', this.secret()).update(payload).digest('hex').slice(0, 32);
    return `${payload}.${sig}`;
  }

  private verifyState(state: string) {
    const [id, exp, o, sig] = state.split('.');
    if (!id || !exp || !o || !sig) throw new UnauthorizedException('Ghalat request');
    const expected = crypto.createHmac('sha256', this.secret()).update(`${id}.${exp}.${o}`).digest('hex').slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new UnauthorizedException('Ghalat request');
    if (Date.now() > Number(exp)) throw new UnauthorizedException('Link purana ho gaya — dobara connect karein');
    return { id, origin: this.webOrigin(Buffer.from(o, 'base64url').toString()) };
  }

  private async log(integration: Integration, operation: string, ok: boolean, error?: string, details?: any) {
    await this.prisma.syncLog.create({
      data: {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        operation,
        direction: operation === 'PRODUCTS_IMPORT' ? 'INBOUND' : 'OUTBOUND',
        status: ok ? 'SUCCESS' : 'FAILED',
        recordsSuccess: Number(details?.updated ?? details?.created ?? details?.installed ?? (ok ? 1 : 0)) || 0,
        recordsFailed: Number(details?.failed ?? (ok ? 0 : 1)) || 0,
        errorMessage: error?.slice(0, 500),
        details,
        completedAt: new Date(),
      },
    }).catch(() => null);
  }
}

export { ShopifyError };
