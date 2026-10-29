import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { WebsiteCatalogService } from './website-catalog.service';
import { WebsiteSetupService } from './website-setup.service';
import { readWebsiteConfig, ShopifyPlanState } from './website-config';
import { SHOPIFY_SCOPES, ShopifyClient, ShopifyError, numericId, orderGid } from './shopify.client';
import { mappingKey } from './mapping-key';
import { forEachLinkPage, linkScope, PAGE_DELAY_MS, trackLinks } from './link-sync';
import { lookupShopFromDomain, normalizeShopifySiteUrl, parseShopAddress, shopAddressError } from './shopify-shop';

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

/** State prefix for installs that start in Shopify (no Nafaa channel yet) */
const SHOP_STATE = 'shop_';

/**
 * SystemSetting key that marks a store which installed Nafaa from the App
 * Store listing. Those stores pay for the Shopify connection through Shopify
 * App Pricing; stores Nafaa onboards through its own install link are billed
 * directly (Shopify Support, ticket 71422316).
 */
const appStoreKey = (shop: string) => `shopify.appstore-install:${shop}`;

/** How long a plan read stays fresh before the cron asks Shopify again */
const PLAN_TTL_MS = 60 * 60_000;

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
    const parsed = parseShopAddress(raw);
    if (!parsed.ok) throw new BadRequestException(shopAddressError(parsed));
    return parsed.shop;
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
   * App URL. Shopify opens it with ?shop&hmac&timestamp when a merchant
   * installs from the App Store or opens Nafaa from their admin.
   * Not installed yet → straight to Shopify's grant screen (App Store
   * review checks this). Already connected → Nafaa.
   */
  async install(query: Record<string, string>): Promise<string> {
    const web = this.webOrigin();
    if (!this.configured()) throw new BadRequestException('Shopify app ki keys server par nahi lagi');
    if (!this.verifyQueryHmac(query)) throw new UnauthorizedException('Shopify ka signature match nahi hua');
    const shop = this.normalizeShop(String(query.shop ?? ''));

    const channels = await this.shopChannels(shop);
    if (channels.some((i) => this.isConnected(i))) return this.appHome(web, shop);

    const params = new URLSearchParams({
      client_id: this.clientId(),
      scope: SHOPIFY_SCOPES,
      redirect_uri: this.redirectUri(),
      state: this.signState(`${SHOP_STATE}${Buffer.from(shop).toString('base64url')}`, web),
    });
    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
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
      web = origin;
      if (id.startsWith(SHOP_STATE)) return await this.installCallback(query, Buffer.from(id.slice(SHOP_STATE.length), 'base64url').toString(), web);
      channelId = id;
      if (!this.verifyQueryHmac(query)) throw new UnauthorizedException('Shopify ka signature match nahi hua');
      const shop = this.normalizeShop(String(query.shop ?? ''));
      if (!query.code) throw new BadRequestException(query.error_description || 'Install cancel hua');

      const integration = await this.prisma.integration.findUniqueOrThrow({ where: { id } });
      const expected = readWebsiteConfig(integration.config).siteUrl;
      if (expected && expected !== `https://${shop}`) {
        throw new BadRequestException(`Ye install ${shop} ka hai, jabke Nafaa ${expected.replace('https://', '')} ka intezar kar raha tha`);
      }

      await this.saveToken(integration, shop, await this.exchangeCode(shop, query.code));
      return `${web}/connect/shopify/done?channel=${id}&success=1`;
    } catch (e: any) {
      this.logger.warn(`Shopify callback: ${e?.message}`);
      const msg = encodeURIComponent(String(e?.response?.message ?? e?.message ?? 'Masla hua').slice(0, 200));
      return `${web}/connect/shopify/done?channel=${channelId}&success=0&error=${msg}`;
    }
  }

  /**
   * Install that started in Shopify. The code is exchanged right away so the
   * install completes, but the token is not kept: any Nafaa account can create
   * a pending channel with someone else's store name, so the store is only
   * linked when the merchant logs in to their own Nafaa account and connects
   * it. Shopify skips the grant screen that second time.
   */
  private async installCallback(query: Record<string, string>, expectedShop: string, web: string): Promise<string> {
    if (!this.verifyQueryHmac(query)) throw new UnauthorizedException('Shopify ka signature match nahi hua');
    const shop = this.normalizeShop(String(query.shop ?? ''));
    if (shop !== expectedShop) throw new BadRequestException('Store ka naam match nahi hua');
    if (!query.code) throw new BadRequestException(query.error_description || 'Install cancel hua');

    await this.exchangeCode(shop, query.code);
    await this.markAppStoreInstall(shop);
    return this.appHome(web, shop);
  }

  // ═══════════════════════════════════════════════════════════
  // BILLING — App Store installs pay through Shopify App Pricing
  // ═══════════════════════════════════════════════════════════

  /**
   * Shop-initiated installs come from the App Store listing (or from the app
   * in the Shopify admin before the store is linked). Kept once; a store that
   * came from the App Store stays Shopify-billed.
   */
  private async markAppStoreInstall(shop: string) {
    await this.prisma.systemSetting.upsert({
      where: { key: appStoreKey(shop) },
      create: {
        key: appStoreKey(shop),
        value: new Date().toISOString(),
        category: 'shopify',
        description: 'Store installed Nafaa from the Shopify App Store; the Shopify connection is billed through Shopify',
      },
      update: {},
    }).catch((e) => this.logger.warn(`Shopify App Store mark ${shop}: ${e?.message}`));
  }

  private async billingFor(shop: string): Promise<'direct' | 'shopify'> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: appStoreKey(shop) } }).catch(() => null);
    return row ? 'shopify' : 'direct';
  }

  /** Merchant's own app (token / client credentials) never goes through Nafaa's App Store billing */
  private ownApp(integration: Integration) {
    const mode = (integration.credentials as any)?.shopifyMode;
    return mode === 'token' || mode === 'client';
  }

  /** App Store install without an active Shopify plan: nothing is synced until the merchant picks one */
  planBlocked(integration: Integration) {
    if (integration.type !== 'SHOPIFY' || this.ownApp(integration)) return false;
    const cfg = readWebsiteConfig(integration.config);
    return cfg.shopifyBilling === 'shopify' && !cfg.shopifyPlan?.active;
  }

  /** Shopify's plan page for this store (managed App Pricing) */
  pricingUrl(shop: string) {
    const store = shop.replace(/\.myshopify\.com$/, '');
    const app = (process.env.SHOPIFY_APP_HANDLE || 'nafaa').trim();
    return `https://admin.shopify.com/store/${store}/charges/${app}/pricing_plans`;
  }

  /** Read the store's App Pricing subscription from Shopify and keep it on the channel */
  async refreshPlan(integration: Integration): Promise<ShopifyPlanState | null> {
    if (this.ownApp(integration) || readWebsiteConfig(integration.config).shopifyBilling !== 'shopify') return null;
    const client = await this.client(integration);
    if (!client) return null;
    const data = await client.graphql<any>(`{
      currentAppInstallation { activeSubscriptions { name status test } }
    }`);
    const subs: any[] = data?.currentAppInstallation?.activeSubscriptions ?? [];
    const live = subs.find((x) => x.status === 'ACTIVE');
    const plan: ShopifyPlanState = {
      active: !!live,
      name: live?.name ?? null,
      status: live?.status ?? subs[0]?.status ?? null,
      test: !!live?.test,
      checkedAt: new Date().toISOString(),
    };
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: integration.id } });
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { config: { ...readWebsiteConfig(fresh.config), shopifyPlan: plan } as any },
    });
    await this.log(integration, 'SHOPIFY_PLAN', plan.active, plan.active ? undefined : 'Shopify plan chuna nahi gaya', { name: plan.name, status: plan.status });
    return plan;
  }

  /** Channel page: plan state and Shopify's plan page link */
  async planInfo(user: AuthenticatedUser, channelId: string) {
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const plan = await this.refreshPlan(integration).catch(() => null);
    const shop = (integration.credentials as any)?.shopifyShop ?? '';
    return {
      billing: this.ownApp(integration) ? 'direct' : readWebsiteConfig(integration.config).shopifyBilling,
      plan,
      pricingUrl: shop ? this.pricingUrl(shop) : null,
    };
  }

  private appHome(web: string, shop: string) {
    return `${web}/shopify?shop=${encodeURIComponent(shop)}`;
  }

  private async shopChannels(shop: string) {
    return (await this.prisma.integration.findMany({ where: { type: 'SHOPIFY' } }))
      .filter((i) => readWebsiteConfig(i.config).siteUrl === `https://${shop}`);
  }

  /** code → access token */
  private async exchangeCode(shop: string, code: string) {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      // Shopify ab sirf "expiring offline token" maanta hai: 1 ghanta ka
      // access token + 90 din ka refresh token (har refresh par naya).
      body: JSON.stringify({ client_id: this.clientId(), client_secret: this.clientSecret(), code, expiring: 1 }),
    });
    const tok: any = await res.json().catch(() => null);
    if (!res.ok || !tok?.access_token) throw new BadRequestException(tok?.error_description ?? 'Shopify se token nahi mila');
    return tok;
  }

  private async saveToken(integration: Integration, shop: string, tok: any) {
    const cfg = readWebsiteConfig(integration.config);
    const shopifyBilling = await this.billingFor(shop);
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        credentials: {
          ...this.tokenFields(tok),
          shopifyScopes: tok.scope ?? SHOPIFY_SCOPES,
          shopifyShop: shop,
          shopifyConnectedAt: new Date().toISOString(),
        },
        config: { ...cfg, platform: 'shopify', siteUrl: `https://${shop}`, shopifySecret: null, shopifyBilling } as any,
        status: IntegrationStatus.CONNECTED,
        isActive: true,
      },
    });
    setTimeout(() => this.afterConnect(integration.id).catch((e) => this.logger.warn(`Shopify setup fail: ${e?.message}`)), 300);
  }

  /** Webhooks, store ka naam, location, pehla stock sync */
  async afterConnect(id: string, opts: { webhooks?: boolean } = {}) {
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

    await this.refreshPlan(integration).catch((e) => this.logger.warn(`Shopify plan check: ${e?.message}`));

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

    if (opts.webhooks !== false) {
      const res = await this.installWebhooks(integration);
      await this.log(integration, 'SHOPIFY_CONNECT', res.ok, res.error, { installed: res.installed });
    }
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id } });
    if (!this.planBlocked(fresh)) this.syncStock(fresh).catch(() => null);
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
    const channels = await this.shopChannels(shop);

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
    if (this.planBlocked(integration)) return;
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
      } else if (status === 'RETURNED') {
        // Fulfilled order Shopify me cancel nahi hota — tag + note
        await this.tag(client, id, ['Nafaa: Returned (RTO)']);
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

    if (['CONFIRMED', 'CANCELLED', 'REJECTED', 'RETURNED'].includes(status)) {
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
      for (let i of list) {
        if (!this.isConnected(i)) continue;
        const cfg = readWebsiteConfig(i.config);
        const stale = !cfg.shopifyPlan || Date.now() - new Date(cfg.shopifyPlan.checkedAt).getTime() > PLAN_TTL_MS;
        if (cfg.shopifyBilling === 'shopify' && stale) {
          await this.refreshPlan(i).catch((e) => this.logger.warn(`Shopify plan check ${i.displayName}: ${e?.message}`));
          i = await this.prisma.integration.findUniqueOrThrow({ where: { id: i.id } });
        }
        if (this.planBlocked(i)) continue;
        await this.syncAllStock(i).catch((e) => this.logger.warn(`Shopify stock sync ${i.displayName}: ${e?.message}`));
      }
    } finally {
      this.running = false;
    }
  }

  /** Nafaa → Shopify qeemat (jore hue variants). Product ke hisaab se ek mutation */
  async pushPrices(integration: Integration, items: { externalProductId: string; externalVariantId: string | null; price: number }[]) {
    if (this.planBlocked(integration)) return 0;
    const client = await this.mustClient(integration);
    const byProduct = new Map<string, { id: string; price: string }[]>();
    for (const i of items) {
      let vid = i.externalVariantId;
      if (!vid) {
        // Sirf product jura (ek variant wala) — pehla variant lo
        const d = await this.graphqlSafe(client, `query($id: ID!) { product(id: $id) { variants(first: 1) { nodes { id } } } }`, { id: `gid://shopify/Product/${i.externalProductId}` });
        vid = d?.product?.variants?.nodes?.[0]?.id ? numericId(d.product.variants.nodes[0].id) : null;
      }
      if (!vid) continue;
      const pid = `gid://shopify/Product/${i.externalProductId}`;
      byProduct.set(pid, [...(byProduct.get(pid) ?? []), { id: `gid://shopify/ProductVariant/${vid}`, price: String(i.price) }]);
    }
    let sent = 0;
    for (const [pid, variants] of byProduct) {
      await client.mutate(`mutation($pid: ID!, $v: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $pid, variants: $v) { productVariants { id } userErrors { field message } }
      }`, { pid, v: variants }, 'productVariantsBulkUpdate');
      sent += variants.length;
    }
    await this.log(integration, 'PRICE_PUSH', true, undefined, { sent });
    return sent;
  }

  private async graphqlSafe(client: any, q: string, v: Record<string, any>) {
    return client.graphql(q, v).catch(() => null);
  }

  /** Nafaa → Shopify stock. onlySkus / onlyLinks = sirf badle hue (POS sale ke baad tez push) */
  async syncStock(integration: Integration, opts: { onlySkus?: string[]; onlyLinks?: { externalProductId: string; externalVariantId: string | null }[] } = {}) {
    // Stock push switched off for this channel: nothing goes out, from any path.
    if (!readWebsiteConfig(integration.config).pushStock) return { updated: 0, checked: 0, missing: 0, off: true };
    if (this.planBlocked(integration)) return { updated: 0, checked: 0, missing: 0, off: true };
    return trackLinks(this.prisma, integration.id, linkScope(opts), () => this.pushStock(integration, opts));
  }

  /** Full sync: every link page by page (no listing cap), then the listing pass for SKU-only matches. */
  async syncAllStock(integration: Integration) {
    if (!readWebsiteConfig(integration.config).pushStock) return { updated: 0, checked: 0, missing: 0, off: true };
    if (this.planBlocked(integration)) return { updated: 0, checked: 0, missing: 0, off: true };
    let updated = 0;
    let checked = 0;
    await forEachLinkPage(this.prisma, integration.id, 100, async (onlyLinks) => {
      const r = await this.syncStock(integration, { onlyLinks });
      updated += r.updated;
      checked += r.checked;
    }, PAGE_DELAY_MS.SHOPIFY);
    const rest = await this.syncStock(integration);
    return { updated: updated + rest.updated, checked: checked + rest.checked, missing: rest.missing };
  }

  private async pushStock(integration: Integration, opts: { onlySkus?: string[]; onlyLinks?: { externalProductId: string; externalVariantId: string | null }[] }) {
    const client = await this.mustClient(integration);
    const cfg = readWebsiteConfig(integration.config) as any;
    const locationId: string | null = cfg.shopifyLocationId;
    if (!locationId) throw new BadRequestException('Shopify location nahi mili — "Webhooks check" dabayein');

    const partial = !!(opts.onlySkus?.length || opts.onlyLinks?.length);
    const q = opts.onlySkus?.length
      ? [...new Set(opts.onlySkus)].slice(0, 50).map((s) => `sku:${JSON.stringify(s)}`).join(' OR ')
      : null;
    const VARIANT = `id sku inventoryItem { id tracked inventoryLevel(locationId: $loc) { quantities(names: ["available"]) { quantity } } }`;
    let variants: any[] = [];
    if (!partial || q) {
      variants = await client.paginate<any>(`query($after: String, $q: String, $loc: ID!) {
        productVariants(first: 250, after: $after, query: $q) { nodes { ${VARIANT} } pageInfo { hasNextPage endCursor } }
      }`, 'productVariants', { q, loc: locationId }, 20);
    }
    // Jore hue variants / products seedha id se (SKU ho ya na ho)
    const links = opts.onlyLinks ?? [];
    const ids = [...new Set(links.map((l) => (l.externalVariantId ? `gid://shopify/ProductVariant/${l.externalVariantId}` : `gid://shopify/Product/${l.externalProductId}`)))];
    for (let i = 0; i < ids.length; i += 50) {
      const data = await client.graphql<any>(`query($ids: [ID!]!, $loc: ID!) {
        nodes(ids: $ids) {
          ... on ProductVariant { ${VARIANT} }
          ... on Product { variants(first: 100) { nodes { ${VARIANT} } } }
        }
      }`, { ids: ids.slice(i, i + 50), loc: locationId }).catch(() => null);
      for (const n of data?.nodes ?? []) {
        if (!n) continue;
        if (n.variants) variants.push(...(n.variants.nodes ?? []));
        else if (n.inventoryItem) variants.push(n);
      }
    }
    variants = [...new Map(variants.map((v) => [v.id, v])).values()];

    // Pehle jore hue variants (link), phir SKU — stock ka malik Nafaa
    const linkStock = await this.catalog.stockByLink(integration);
    const rows = variants.filter((v) => v.inventoryItem?.id && (v.sku || linkStock.has(numericId(v.id))));
    const skus = [...new Set(rows.filter((r) => !linkStock.has(numericId(r.id))).map((r) => String(r.sku)).filter(Boolean))];
    if (!rows.length) {
      await this.log(integration, 'STOCK_SYNC', true, undefined, { updated: 0, note: 'Koi variant jora hua nahi, na SKU mila' });
      return { updated: 0, checked: 0, missing: 0 };
    }
    const stock = skus.length ? await this.catalog.stockBySku(integration.tenantId, cfg.shopId ?? integration.shopId, integration.id, skus, cfg.stockBuffer) : {};

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
    if (this.planBlocked(integration)) throw new BadRequestException('Pehle Shopify me Nafaa ka plan chunein — channel page par "Shopify plan chunein" dabayein');
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
    if (this.planBlocked(integration)) throw new BadRequestException('Pehle Shopify me Nafaa ka plan chunein — channel page par "Shopify plan chunein" dabayein');
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
  // MANUAL — merchant's own app (no Nafaa app install)
  //   token:  legacy custom app, Admin API access token (shpat_…)
  //   client: Dev Dashboard app, client ID + secret (24 hour tokens)
  // ═══════════════════════════════════════════════════════════

  /** 'app' = Nafaa App Store install, 'token' / 'client' = merchant's own app. */
  mode(integration: Integration): ShopifyMode | null {
    const c = (integration.credentials ?? {}) as any;
    if (!c.shopifyToken && !c.shopifyClientSecret) return null;
    return c.shopifyMode === 'token' || c.shopifyMode === 'client' ? c.shopifyMode : 'app';
  }

  /** Address check before connecting: any pasted form, custom domains looked up. */
  async resolveAddress(raw: string) {
    const parsed = parseShopAddress(raw);
    let shop: string | null = parsed.ok ? parsed.shop : null;
    let via: 'typed' | 'domain' = 'typed';
    if (!parsed.ok && parsed.reason === 'custom-domain' && parsed.domain) {
      shop = await lookupShopFromDomain(parsed.domain);
      via = 'domain';
    }
    if (!shop) {
      return { ok: false, shop: null, via, error: parsed.ok ? 'Store nahi mila' : parsed.reason === 'custom-domain'
        ? `${parsed.domain} se Shopify store ka address nahi mila. Shopify admin → Settings → Domains me ".myshopify.com" wala address copy karein.`
        : shopAddressError(parsed) };
    }
    const exists = await this.storeExists(shop);
    if (exists === false) {
      return { ok: false, shop, via, error: `${shop} naam ka koi Shopify store nahi mila. Spelling check karein — Shopify admin → Settings → Domains me sahi address likha hota hai.` };
    }
    return { ok: true, shop, via, error: null as string | null };
  }

  /** Public storefront answers 404 for a handle that does not exist. Null = could not tell. */
  private async storeExists(shop: string): Promise<boolean | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(`https://${shop}/`, { method: 'GET', redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'Nafaa-POS/1.0' } });
      res.body?.cancel().catch(() => null);
      return res.status === 404 ? false : true;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Connects a channel with the merchant's own app. Nothing is saved unless
   * Shopify accepts the credentials, so a failure always leaves the channel
   * as it was.
   */
  async connectCustom(user: AuthenticatedUser, channelId: string | null, body: {
    shop?: string; token?: string; apiSecret?: string; clientId?: string; clientSecret?: string; displayName?: string; shopId?: string;
  }) {
    this.setup.assertCanManage(user);
    const existing = channelId ? await this.setup.requireChannel(user.tenantId, channelId) : null;
    if (existing && existing.type !== 'SHOPIFY') throw new BadRequestException('Ye Shopify channel nahi. Sales channels → "Channel jorein" se naya Shopify channel banayein.');
    const prior = (existing?.credentials ?? {}) as any;
    const shop = this.normalizeShop(body.shop || prior.shopifyShop || readWebsiteConfig(existing?.config).siteUrl || '');

    const token = String(body.token ?? '').trim();
    const clientId = String(body.clientId ?? '').trim();
    const clientSecret = String(body.clientSecret ?? '').trim();
    const apiSecret = String(body.apiSecret ?? '').trim();
    const mode: 'token' | 'client' = clientId || clientSecret ? 'client' : 'token';

    let accessToken: string;
    let expiresIn: number | null = null;
    if (mode === 'client') {
      if (!clientId || !clientSecret) throw new BadRequestException('Client ID aur Client secret dono daalein (Dev Dashboard → app → Settings).');
      const tok = await this.clientCredentials(shop, clientId, clientSecret);
      accessToken = tok.access_token;
      expiresIn = Number(tok.expires_in) || null;
    } else {
      if (!token) throw new BadRequestException('Admin API access token daalein — "shpat_" se shuru hota hai.');
      if (token.startsWith('shpss_')) throw new BadRequestException('Ye "API secret key" hai, token nahi. Token "shpat_" se shuru hota hai — app → API credentials → Admin API access token.');
      if (/\s/.test(token) || token.length < 20) throw new BadRequestException('Token poora copy nahi hua — "shpat_" se le kar aakhir tak copy karein.');
      accessToken = token;
    }

    const check = await new ShopifyClient(shop, accessToken).accessScopes();
    if (check.status !== 200) throw new BadRequestException(this.tokenProblem(check.status, check.error, mode));

    const missing = missingScopes(check.scopes);
    const core = missing.filter((x) => CORE_SCOPES.includes(x));
    if (core.length) {
      throw new BadRequestException(`Token chal raha hai magar ye permissions nahi di gayin: ${core.join(', ')}. App → Configuration → Admin API scopes me tick karke Save karein, phir app dobara install karein${mode === 'token' ? ' aur naya token lagayein' : ''}.`);
    }

    // Verified: now attach to this channel, an existing channel for the same store, or a new one.
    const integration = existing
      ?? (await this.prisma.integration.findMany({ where: { tenantId: user.tenantId, type: 'SHOPIFY', apiKey: { not: null } } }))
        .find((i) => normalizeShopifySiteUrl(readWebsiteConfig(i.config).siteUrl) === `https://${shop}` && !this.isConnected(i))
      ?? await this.setup.createChannel(user, {
        type: 'SHOPIFY',
        displayName: body.displayName?.trim() || shop.replace('.myshopify.com', ''),
        shopId: body.shopId,
        siteUrl: `https://${shop}`,
      });
    if (!existing && this.isConnected(integration)) throw new BadRequestException('Ye store pehle se jura hua hai.');
    const creds = (integration.credentials ?? {}) as any;
    const cfg = readWebsiteConfig(integration.config);

    const now = new Date();
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        credentials: {
          shopifyMode: mode,
          shopifyShop: shop,
          shopifyToken: encrypt(accessToken),
          shopifyRefreshToken: null,
          shopifyTokenExpiresAt: expiresIn ? new Date(now.getTime() + expiresIn * 1000).toISOString() : null,
          shopifyClientId: mode === 'client' ? clientId : null,
          shopifyClientSecret: mode === 'client' ? encrypt(clientSecret) : null,
          // Webhooks registered through the Admin API are signed with the app's secret.
          shopifyApiSecret: mode === 'token' && apiSecret ? encrypt(apiSecret) : (mode === 'token' ? creds.shopifyApiSecret ?? null : null),
          shopifyScopes: check.scopes.join(','),
          shopifyConnectedAt: now.toISOString(),
          shopifyReauth: false,
        },
        config: { ...cfg, platform: 'shopify', siteUrl: `https://${shop}` } as any,
        status: IntegrationStatus.CONNECTED,
        isActive: true,
      },
    });
    await this.log(integration, 'SHOPIFY_CUSTOM_CONNECT', true, undefined, { mode, scopes: check.scopes, missing });
    await this.afterConnect(integration.id, { webhooks: false }).catch((e) => this.logger.warn(`Shopify custom setup: ${e?.message}`));
    return { ok: true, channelId: integration.id, shop, mode, missingScopes: missing };
  }

  /** Registers order webhooks through the Admin API (merchant's own app). */
  async customWebhooks(user: AuthenticatedUser, channelId: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    if (!this.isConnected(integration)) throw new BadRequestException('Pehle Admin API token lagayein, phir webhooks khud lagenge.');
    const res = await this.installWebhooks(integration);
    await this.log(integration, 'SHOPIFY_WEBHOOKS', res.ok, res.error, { installed: res.installed });
    if (!res.ok) {
      throw new BadRequestException(/access denied|scope/i.test(res.error ?? '')
        ? 'Shopify ne webhooks lagane ki ijazat nahi di — app ke scopes me read_orders tick hai? Warna neeche wale steps se khud lagayein.'
        : `Webhooks nahi lage: ${res.error ?? 'pata nahi kyun'}. Neeche wale steps se khud bhi laga sakte hain.`);
    }
    return res;
  }

  /** Removes the merchant's own app credentials; orders and links stay. */
  async disconnectCustom(user: AuthenticatedUser, channelId: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const mode = this.mode(integration);
    if (mode !== 'token' && mode !== 'client') throw new BadRequestException('Ye channel Nafaa app se jura hai — Shopify admin se app hatayein.');
    await this.prisma.integration.update({ where: { id: integration.id }, data: { credentials: {} } });
    await this.log(integration, 'SHOPIFY_CUSTOM_DISCONNECT', true);
    return { ok: true };
  }

  /** Secrets that may sign this channel's webhooks (empty list = cannot verify). */
  webhookSecrets(integration: Integration): string[] {
    const c = (integration.credentials ?? {}) as any;
    const cfg = readWebsiteConfig(integration.config);
    const mode = this.mode(integration);
    if (mode === 'app') return process.env.SHOPIFY_CLIENT_SECRET ? [process.env.SHOPIFY_CLIENT_SECRET] : [];
    const list = [
      mode === 'client' ? decrypt(c.shopifyClientSecret) : null,
      mode === 'token' ? decrypt(c.shopifyApiSecret) : null,
      cfg.shopifySecret,
    ];
    return list.filter((x): x is string => !!x);
  }

  /** Every check the setup screen shows, in plain words. */
  async check(user: AuthenticatedUser, channelId: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readWebsiteConfig(integration.config) as any;
    const creds = (integration.credentials ?? {}) as any;
    const out: CheckItem[] = [];
    const add = (c: CheckItem) => out.push(c);

    const parsed = parseShopAddress(creds.shopifyShop || cfg.siteUrl || '');
    add(parsed.ok
      ? { key: 'address', ok: true, title: 'Store ka address', detail: parsed.shop }
      : { key: 'address', ok: false, title: 'Store ka address', detail: shopAddressError(parsed), fix: 'Setup me sahi ".myshopify.com" address daal kar dobara jorein.' });

    const lastOrder = await this.prisma.channelOrder.findFirst({
      where: { integrationId: integration.id, NOT: { externalOrderId: { startsWith: 'TEST-' } } },
      orderBy: { receivedAt: 'desc' }, select: { receivedAt: true },
    });
    const lastFail = await this.prisma.webhookLog.findFirst({
      where: { integrationId: integration.id, processed: false, receivedAt: { gte: new Date(Date.now() - 7 * 86400e3) } },
      orderBy: { receivedAt: 'desc' }, select: { errorMessage: true },
    });

    const mode = this.mode(integration);
    if (!mode || !creds.shopifyToken) {
      add({ key: 'token', ok: false, warn: true, title: 'Admin API token', detail: 'Nahi laga. Orders webhook se aa sakte hain, magar products, stock aur status ke liye token zaroori hai.', fix: 'Setup → Manual → "Admin API token" wale steps.' });
      add(this.ordersCheck(lastOrder?.receivedAt ?? null, integration.webhookVerified, lastFail?.errorMessage ?? null));
      return { ok: out.every((c) => c.ok || c.warn), mode: null, checks: out };
    }

    const client = await this.client(integration).catch(() => null);
    const scopes = client ? await client.accessScopes() : { status: 401, scopes: [] as string[], error: 'token nahi mila' };
    if (scopes.status !== 200) {
      add({ key: 'token', ok: false, title: mode === 'app' ? 'Nafaa app' : 'Admin API token', detail: this.tokenProblem(scopes.status, scopes.error, mode === 'client' ? 'client' : 'token'),
        fix: mode === 'app' ? 'Connection card par "Dobara install" dabayein.' : 'Shopify me app kholein, naya token / secret lein aur Setup me dobara lagayein.' });
      add(this.ordersCheck(lastOrder?.receivedAt ?? null, integration.webhookVerified, lastFail?.errorMessage ?? null));
      return { ok: false, mode, checks: out };
    }
    add({ key: 'token', ok: true, title: mode === 'app' ? 'Nafaa app' : 'Admin API token', detail: 'Shopify ne qabool kiya' });

    const missing = missingScopes(scopes.scopes);
    add(missing.length
      ? { key: 'scopes', ok: false, warn: !missing.some((m) => CORE_SCOPES.includes(m)), title: 'Permissions (scopes)', detail: `Kam hain: ${missing.join(', ')}`,
          fix: mode === 'app' ? '"Dobara install" dabayein.' : 'App → Configuration → Admin API scopes me tick karein, Save, app dobara install karein.' }
      : { key: 'scopes', ok: true, title: 'Permissions (scopes)', detail: 'Sab maujood' });

    try {
      const data = await client!.graphql<any>(`{ productsCount { count } locations(first: 20) { nodes { id name isActive fulfillsOnlineOrders } } }`);
      const count = data?.productsCount?.count ?? 0;
      add({ key: 'products', ok: true, title: 'Products', detail: `${count} products Shopify par dikh rahe hain` });
      const locs: any[] = data?.locations?.nodes ?? [];
      const loc = locs.find((l) => l.id === cfg.shopifyLocationId && l.isActive)
        ?? locs.find((l) => l.isActive && l.fulfillsOnlineOrders) ?? locs.find((l) => l.isActive);
      if (loc && loc.id !== cfg.shopifyLocationId) {
        await this.prisma.integration.update({ where: { id: integration.id }, data: { config: { ...cfg, shopifyLocationId: loc.id, shopifyLocationName: loc.name } as any } });
      }
      add(loc
        ? { key: 'location', ok: true, title: 'Stock location', detail: loc.name }
        : { key: 'location', ok: false, title: 'Stock location', detail: 'Koi active location nahi mili', fix: 'Shopify → Settings → Locations me kam az kam ek location active karein.' });
    } catch (e: any) {
      add({ key: 'products', ok: false, title: 'Products', detail: e?.message ?? 'Products nahi parh sake', fix: 'read_products aur read_locations scopes check karein.' });
    }

    const hook = this.setup.urls(integration.apiKey).hook;
    try {
      const subs = await client!.paginate<any>(`query($after: String) {
        webhookSubscriptions(first: 100, after: $after) {
          nodes { topic endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } }
          pageInfo { hasNextPage endCursor }
        }
      }`, 'webhookSubscriptions', {}, 3);
      const have = new Set(subs.filter((w) => w.endpoint?.callbackUrl === hook).map((w) => w.topic));
      const need = ['ORDERS_CREATE', 'ORDERS_UPDATED', 'ORDERS_CANCELLED'];
      const lacking = need.filter((t) => !have.has(t));
      if (!lacking.length) add({ key: 'webhooks', ok: true, title: 'Webhooks', detail: `${have.size} lage hue hain` });
      else if (lastOrder || integration.webhookVerified) add({ key: 'webhooks', ok: true, warn: mode !== 'app', title: 'Webhooks', detail: 'Hath se lage webhooks se orders aa rahe hain' });
      else add({ key: 'webhooks', ok: false, title: 'Webhooks', detail: `Nahi lage: ${lacking.map(topicLabel).join(', ')}`,
        fix: mode === 'app' ? '"Check" dabayein — Nafaa khud lagata hai.' : '"Webhooks khud lagayein" dabayein, ya steps dekh kar hath se lagayein.' });
    } catch {
      add(this.ordersCheck(lastOrder?.receivedAt ?? null, integration.webhookVerified, lastFail?.errorMessage ?? null));
    }

    if (lastFail?.errorMessage && /signature/i.test(lastFail.errorMessage)) {
      add({ key: 'signature', ok: false, title: 'Webhook signature', detail: 'Pichle hafte kuch orders signature ki wajah se ruk gaye',
        fix: mode === 'token' ? 'Setup me app ki "API secret key" lagayein (hath se bane webhooks ke liye Notifications wali key).' : 'Setup me signing key dobara check karein.' });
    }
    return { ok: out.every((c) => c.ok || c.warn), mode, checks: out };
  }

  private ordersCheck(lastOrderAt: Date | null, verified: boolean, lastError: string | null): CheckItem {
    if (lastOrderAt || verified) return { key: 'orders', ok: true, title: 'Orders', detail: lastOrderAt ? `Aakhri order ${lastOrderAt.toISOString().slice(0, 10)}` : 'Webhook pahunch raha hai' };
    return { key: 'orders', ok: false, warn: true, title: 'Orders', detail: lastError ? `Aakhri ghalti: ${lastError}` : 'Abhi tak koi order nahi aaya',
      fix: 'Shopify par ek test order karein. Na aaye to webhooks ka URL dobara copy karein.' };
  }

  /** Shopify's answer to a token check, in plain words. */
  private tokenProblem(status: number, error: string | undefined, mode: 'token' | 'client') {
    if (status === 401) {
      return mode === 'client'
        ? 'Shopify ne token qabool nahi kiya — app is store par install nahi, ya hata di gayi.'
        : 'Shopify ne token qabool nahi kiya — ghalat copy hua, ya app uninstall / token band ho gaya. App kholein aur naya token lein.';
    }
    if (status === 403) return 'Token sahi hai magar is kaam ki ijazat nahi — app ke Admin API scopes check karein.';
    if (status === 404) return 'Is address par Shopify store nahi mila — ".myshopify.com" wala address check karein.';
    if (status === 402 || status === 423) return 'Shopify store band hai (plan khatam ya lock). Store chalu karein, phir jorein.';
    if (status === 0) return `Shopify tak nahi pahunch sake${error ? ` (${error})` : ''}. Thori der baad dobara koshish karein.`;
    return `Shopify ne ${status} diya${error ? `: ${error}` : ''}`;
  }

  /** Client credentials grant (Dev Dashboard apps). Token lasts about 24 hours. */
  private async clientCredentials(shop: string, clientId: string, clientSecret: string) {
    let res: Response;
    try {
      res = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e: any) {
      throw new BadRequestException(`Shopify tak nahi pahunch sake (${e?.message ?? 'network'}). Thori der baad dobara koshish karein.`);
    }
    const tok: any = await res.json().catch(() => null);
    if (res.ok && tok?.access_token) return tok as { access_token: string; expires_in?: number; scope?: string };
    const why = String(tok?.error_description ?? tok?.error ?? tok?.errors ?? '').slice(0, 160);
    if (res.status === 404) throw new BadRequestException('Is address par Shopify store nahi mila — ".myshopify.com" wala address check karein.');
    if (/invalid_client|client/i.test(why) || res.status === 401) {
      throw new BadRequestException(`Client ID ya Client secret ghalat hai${why ? ` (${why})` : ''}. Dev Dashboard → app → Settings se dobara copy karein.`);
    }
    throw new BadRequestException(`Shopify ne token nahi diya${why ? `: ${why}` : ''}. App is store par install hai? Store aur app ek hi organization me hone chahiye.`);
  }

  /** Fresh client credentials token for a Dev Dashboard channel. */
  private async refreshClientToken(integration: Integration): Promise<string | null> {
    const fresh = await this.prisma.integration.findUnique({ where: { id: integration.id } });
    const c = (fresh?.credentials ?? {}) as any;
    const exp = c.shopifyTokenExpiresAt ? new Date(c.shopifyTokenExpiresAt).getTime() : 0;
    if (c.shopifyToken && exp - Date.now() > 5 * 60_000) return decrypt(c.shopifyToken);
    try {
      const tok = await this.clientCredentials(c.shopifyShop, c.shopifyClientId, decrypt(c.shopifyClientSecret) ?? '');
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          credentials: {
            ...c,
            shopifyToken: encrypt(tok.access_token),
            shopifyTokenExpiresAt: new Date(Date.now() + (Number(tok.expires_in) || 86_399) * 1000).toISOString(),
            shopifyReauth: false,
          },
          status: IntegrationStatus.CONNECTED,
        },
      });
      return tok.access_token;
    } catch (e: any) {
      await this.log(integration, 'SHOPIFY_TOKEN_REFRESH', false, e?.response?.message ?? e?.message);
      return null;
    }
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
    if (c.shopifyMode === 'client' && (!exp || exp - Date.now() <= 5 * 60_000)) {
      const running = this.refreshing.get(integration.id);
      if (running) return running;
      const job = this.refreshClientToken(integration).finally(() => this.refreshing.delete(integration.id));
      this.refreshing.set(integration.id, job);
      return job;
    }
    // Public app token issued before expiring tokens: swap it once for an expiring pair.
    if (!c.shopifyMode && !exp && !c.shopifyRefreshToken) {
      const running = this.refreshing.get(integration.id);
      if (running) return running;
      const job = this.migrateLegacyToken(integration).finally(() => this.refreshing.delete(integration.id));
      this.refreshing.set(integration.id, job);
      return job;
    }
    // Custom app token (never expires) or a token that is still fresh
    if (!exp || exp - Date.now() > 5 * 60_000) return decrypt(c.shopifyToken);
    if (!c.shopifyRefreshToken) return decrypt(c.shopifyToken);

    const running = this.refreshing.get(integration.id);
    if (running) return running;
    const job = this.refresh(integration).finally(() => this.refreshing.delete(integration.id));
    this.refreshing.set(integration.id, job);
    return job;
  }

  /** Last migration attempt per channel, so a failing store is retried at most every 30 minutes. */
  private migrationTried = new Map<string, number>();

  /**
   * Shopify requires public apps to move non-expiring offline tokens to
   * expiring ones before 1 Jan 2027. The exchange invalidates the old token,
   * so the new pair is stored before anything else. If the response is lost,
   * repeating the same request within seven days returns the same pair.
   */
  private async migrateLegacyToken(integration: Integration): Promise<string | null> {
    const fresh = await this.prisma.integration.findUnique({ where: { id: integration.id } });
    const c = (fresh?.credentials ?? {}) as any;
    const old = decrypt(c.shopifyToken);
    // Another request already migrated it
    if (c.shopifyMode || c.shopifyRefreshToken || c.shopifyTokenExpiresAt) return old;
    const last = this.migrationTried.get(integration.id) ?? 0;
    if (Date.now() - last < 30 * 60_000) return old;
    this.migrationTried.set(integration.id, Date.now());

    const res = await fetch(`https://${c.shopifyShop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        client_id: this.clientId(),
        client_secret: this.clientSecret(),
        subject_token: old ?? '',
        subject_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
        requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
        expiring: '1',
      }).toString(),
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    const tok: any = res ? await res.json().catch(() => null) : null;

    if (!res || !res.ok || !tok?.access_token || !tok?.refresh_token) {
      // The old token keeps working until Shopify switches it off, so carry on with it.
      await this.log(integration, 'SHOPIFY_TOKEN_MIGRATE', false,
        `Expiring token nahi mila (${res?.status ?? 'network'}${tok?.error ? `: ${tok.error}` : ''})`);
      return old;
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { credentials: { ...c, ...this.tokenFields(tok) }, status: IntegrationStatus.CONNECTED },
    });
    this.migrationTried.delete(integration.id);
    await this.log(integration, 'SHOPIFY_TOKEN_MIGRATE', true);
    return tok.access_token as string;
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
        ? 'Shopify ne dobara permission maangi — "Dobara install" dabayein'
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

export type ShopifyMode = 'app' | 'token' | 'client';

export interface CheckItem {
  key: string;
  ok: boolean;
  /** Not blocking: shown in amber. */
  warn?: boolean;
  title: string;
  detail: string;
  fix?: string;
}

/** Needed for products, stock and orders; without these manual mode is refused. */
export const CORE_SCOPES = ['read_products', 'write_products', 'read_inventory', 'write_inventory', 'read_locations', 'read_orders'];

/** Scopes Nafaa uses that the token does not have. write_x implies read_x. */
export function missingScopes(granted: string[]): string[] {
  const have = new Set(granted);
  for (const g of granted) if (g.startsWith('write_')) have.add(`read_${g.slice(6)}`);
  return SHOPIFY_SCOPES.split(',').filter((x) => !have.has(x));
}

const TOPIC_LABEL: Record<string, string> = { ORDERS_CREATE: 'Order creation', ORDERS_UPDATED: 'Order update', ORDERS_CANCELLED: 'Order cancellation', ORDERS_PAID: 'Order payment' };
const topicLabel = (t: string) => TOPIC_LABEL[t] ?? t;
