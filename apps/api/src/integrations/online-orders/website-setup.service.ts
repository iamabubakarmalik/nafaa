import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Integration, IntegrationStatus, IntegrationType, Prisma, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { startOfDayTz } from '../../common/helpers/business-time.helper';
import { WebsiteConfig, assertSafeWebhookUrl, readWebsiteConfig } from './website-config';

/** Website jaise channels — har ek ki apni key, settings aur safha */
export const WEBSITE_TYPES: IntegrationType[] = ['CUSTOM_WEBSITE', 'WOOCOMMERCE', 'SHOPIFY', 'DARAZ', 'FOODPANDA'];

const PLATFORM_OF: Record<string, WebsiteConfig['platform']> = {
  CUSTOM_WEBSITE: 'custom',
  WOOCOMMERCE: 'woocommerce',
  SHOPIFY: 'shopify',
  DARAZ: 'daraz',
  FOODPANDA: 'foodpanda',
};

/**
 * Sales channels (Shopify jaisa): har jori hui website / store ek channel hai —
 * sidebar me apne naam se, apni ginti ke saath. Dukaan kai channel jor sakti hai.
 */
@Injectable()
export class WebsiteSetupService {
  constructor(private readonly prisma: PrismaService) {}

  /** Keys sirf malik/manager dekh sakte hain — cashier nahi */
  assertCanManage(user: AuthenticatedUser) {
    const ok: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN];
    if (!ok.includes(user.role)) {
      throw new ForbiddenException('Website connection sirf malik ya manager set kar sakta hai');
    }
  }

  /**
   * Bahar se (WooCommerce, Shopify) pahunchne wala API address. Local par
   * tunnel (ngrok / cloudflared) ka https URL INTEGRATIONS_API_URL me daalein.
   * (PUBLIC_API_URL nahi — wo uploads ke links ke liye pehle se hai, bina /api.)
   */
  apiBase() {
    const raw = (process.env.INTEGRATIONS_API_URL || process.env.API_URL || 'http://localhost:4000/api').trim().replace(/\/+$/, '');
    // Saare raaste global prefix "/api" ke neeche hain (main.ts). Env me
    // "https://api.nafaa.pk" likha ho to bhi callback/webhook sahi banein.
    return /\/api$/.test(raw) ? raw : `${raw}/api`;
  }

  /** Websites hamare server tak pahunch sakti hain? (https + localhost nahi) */
  publicApi() {
    const url = this.apiBase();
    let reachable = false;
    try {
      const u = new URL(url);
      reachable = u.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname) && !/^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(u.hostname);
    } catch { /* ghalat URL */ }
    return {
      url,
      reachable,
      reason: reachable ? null : 'Nafaa ka API abhi bahar se nahi dikhta (https nahi / localhost). WooCommerce keys aur orders sirf https address par bhejta hai.',
      fix: reachable ? null : 'Local test: `ngrok http 4000` chalayein aur apps/api/.env me INTEGRATIONS_API_URL=https://<ngrok-address>/api daal kar API restart karein.',
    };
  }

  urls(apiKey: string | null) {
    const api = this.apiBase();
    const base = `${api}/integrations/website/v1`;
    const origin = api.replace(/\/api$/, '');
    return {
      base,
      orders: `${base}/orders`,
      hook: apiKey ? `${base}/hook/${apiKey}` : null,
      products: `${base}/products`,
      stock: `${base}/stock`,
      verify: `${base}/verify`,
      pluginZip: `${origin}/plugins/nafaa-woocommerce.zip`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // LIST — sidebar aur hub ke liye
  // ═══════════════════════════════════════════════════════════

  /**
   * Har jora hua bechne ka channel (website, WooCommerce, Shopify, Daraz,
   * Foodpanda) — naye orders ki ginti ke saath. Cashier bhi dekh sakta hai
   * (sirf naam aur ginti — keys nahi).
   */
  async listChannels(user: AuthenticatedUser, scope: ShopScope) {
    const channels = await this.prisma.integration.findMany({
      where: { tenantId: user.tenantId, category: 'SALES_CHANNEL', status: { not: IntegrationStatus.PENDING } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, type: true, displayName: true, status: true, isActive: true, config: true, credentials: true,
        webhookVerified: true, createdAt: true, shopId: true, apiKey: true,
      },
    });
    // Hataya gaya website channel (orders ki history ki wajah se archive) — list me nahi
    const visible = channels.filter((c) => !(WEBSITE_TYPES.includes(c.type) && !c.apiKey));
    if (!visible.length) return [];

    const pending = await this.prisma.channelOrder.groupBy({
      by: ['integrationId'],
      where: { tenantId: user.tenantId, orderStatus: 'PENDING', ...(scope.whereLoose as any) },
      _count: { _all: true },
    });
    const last = await this.prisma.channelOrder.groupBy({
      by: ['integrationId'],
      where: { tenantId: user.tenantId },
      _max: { receivedAt: true },
    });

    return visible.map((c) => {
      const cfg = readWebsiteConfig(c.config);
      return {
        id: c.id,
        type: c.type,
        displayName: c.displayName,
        platform: cfg.platform ?? PLATFORM_OF[c.type] ?? null,
        siteUrl: cfg.siteUrl,
        isWebsite: WEBSITE_TYPES.includes(c.type),
        live: c.isActive && c.status === IntegrationStatus.CONNECTED,
        status: c.status,
        oneClick: (c.type === 'WOOCOMMERCE' && !!(c.credentials as any)?.wooKey) || (c.type === 'SHOPIFY' && !!(c.credentials as any)?.shopifyToken),
        receiving: c.webhookVerified || !!last.find((l) => l.integrationId === c.id)?._max.receivedAt,
        pendingOrders: pending.find((p) => p.integrationId === c.id)?._count._all ?? 0,
        lastOrderAt: last.find((l) => l.integrationId === c.id)?._max.receivedAt ?? null,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ONE CHANNEL
  // ═══════════════════════════════════════════════════════════

  async requireChannel(tenantId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, tenantId, type: { in: WEBSITE_TYPES }, apiKey: { not: null } },
    });
    if (!integration) throw new NotFoundException('Ye website nahi mili');
    return integration;
  }

  async createChannel(
    user: AuthenticatedUser,
    body: { type: IntegrationType; displayName?: string; shopId?: string; siteUrl?: string; status?: IntegrationStatus },
  ): Promise<Integration> {
    this.assertCanManage(user);
    if (!WEBSITE_TYPES.includes(body.type)) throw new BadRequestException('Ye website ka type nahi');

    const shopId = await this.validShopId(user.tenantId, body.shopId);
    const apiKey = 'nfk_' + crypto.randomBytes(24).toString('hex');
    const config: WebsiteConfig = {
      ...readWebsiteConfig({}),
      shopId,
      platform: PLATFORM_OF[body.type],
      siteUrl: body.siteUrl ?? null,
    };
    const fallbackName = body.type === 'WOOCOMMERCE' ? 'WooCommerce store' : body.type === 'SHOPIFY' ? 'Shopify store' : body.type === 'DARAZ' ? 'Daraz store' : body.type === 'FOODPANDA' ? 'Foodpanda' : 'Meri website';

    return this.prisma.integration.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        type: body.type,
        category: 'SALES_CHANNEL',
        displayName: body.displayName?.trim().slice(0, 80) || fallbackName,
        status: body.status ?? IntegrationStatus.CONNECTED,
        apiKey,
        apiSecret: crypto.randomBytes(32).toString('hex'),
        webhookSecret: 'nfs_' + crypto.randomBytes(24).toString('hex'),
        webhookUrl: this.urls(apiKey).hook,
        config: config as any,
        credentials: {},
        syncDirection: 'BIDIRECTIONAL',
      },
    });
  }

  async channelOverview(user: AuthenticatedUser, id: string) {
    this.assertCanManage(user);
    const integration = await this.requireChannel(user.tenantId, id);

    const today = startOfDayTz();
    const [total, pending, todayCount, lastOrder, links, webhookLogs, pushLogs] = await Promise.all([
      this.prisma.channelOrder.count({ where: { integrationId: integration.id } }),
      this.prisma.channelOrder.count({ where: { integrationId: integration.id, orderStatus: 'PENDING' } }),
      this.prisma.channelOrder.count({ where: { integrationId: integration.id, receivedAt: { gte: today } } }),
      this.prisma.channelOrder.findFirst({
        where: { integrationId: integration.id, NOT: { externalOrderId: { startsWith: 'TEST-' } } },
        orderBy: { receivedAt: 'desc' },
        select: { receivedAt: true, externalOrderNumber: true },
      }),
      this.prisma.productChannelMapping.count({ where: { integrationId: integration.id } }),
      this.prisma.webhookLog.findMany({
        where: { integrationId: integration.id },
        orderBy: { receivedAt: 'desc' },
        take: 10,
        select: { id: true, event: true, processed: true, errorMessage: true, receivedAt: true },
      }),
      this.prisma.syncLog.findMany({
        where: { integrationId: integration.id },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: { id: true, operation: true, status: true, errorMessage: true, direction: true, startedAt: true },
      }),
    ]);

    // Branch codes jo pichle orders me aaye (Indolj merchantId / partnerIndexCode)
    const seenCodes: Record<string, { firstSeen: string; sample: string }> = {};
    const recentBodies = await this.prisma.webhookLog.findMany({
      where: { integrationId: integration.id, processed: true }, orderBy: { receivedAt: 'desc' }, take: 50, select: { body: true, receivedAt: true },
    }).catch(() => [] as any[]);
    for (const l of recentBodies) {
      const b = (l.body ?? {}) as any;
      const code = String(b?.merchantId ?? b?.partnerIndexCode ?? b?.storeId ?? b?.outletId ?? '').trim();
      if (code && !seenCodes[code]) seenCodes[code] = { firstSeen: new Date(l.receivedAt).toISOString(), sample: String(b?.orderId ?? '').slice(0, 30) };
    }

    const creds = (integration.credentials ?? {}) as any;
    const { apiSecret, credentials, ...safe } = integration as any;
    // Keys / secrets web par nahi — sirf haal
    const { indolj: indoljCfg, foodpanda: _fp, ...cfgSafe } = readWebsiteConfig(integration.config) as any;
    return {
      connected: true,
      integration: {
        ...safe,
        config: cfgSafe,
        branchCodes: Object.entries({ ...seenCodes, ...((integration.config as any)?.branchCodes ?? {}) }).map(([code, v]: [string, any]) => ({
          code, firstSeen: v?.firstSeen ?? null, sample: v?.sample ?? null, shopId: (integration.config as any)?.branchMap?.[code] ?? null,
        })),
        indolj: indoljCfg?.activationToken
          ? { connected: true, connectedAt: indoljCfg.connectedAt ?? null, baseUrl: indoljCfg.baseUrl ?? null }
          : null,
        shopify: integration.type === 'SHOPIFY'
          ? {
              connected: !!creds.shopifyToken,
              // Purana (non-expiring) token ya refresh bhi mar gaya → dobara install
              needsReinstall: !!creds.shopifyReauth || (!!creds.shopifyToken && !creds.shopifyRefreshToken),
              shop: creds.shopifyShop ?? null,
              connectedAt: creds.shopifyConnectedAt ?? null,
              locationName: (integration.config as any)?.shopifyLocationName ?? null,
            }
          : null,
        woo: integration.type === 'WOOCOMMERCE'
          ? { connected: !!creds.wooKey, connectedAt: creds.wooConnectedAt ?? null, permissions: creds.wooPermissions ?? null }
          : null,
        daraz: integration.type === 'DARAZ'
          ? {
              connected: !!creds.darazAccessToken,
              configured: !!(process.env.DARAZ_APP_KEY && process.env.DARAZ_APP_SECRET),
              account: creds.darazAccount ?? null,
              sellerId: creds.darazSellerId ?? null,
              shortCode: creds.darazShortCode ?? null,
              connectedAt: creds.darazConnectedAt ?? null,
              expiresAt: creds.darazExpiresAt ?? null,
              refreshExpiresAt: creds.darazRefreshExpiresAt ?? null,
              error: (integration.config as any)?.darazError ?? null,
              ordersSyncedAt: (integration.config as any)?.darazOrdersSyncedAt ?? null,
            }
          : null,
      },
      urls: this.urls(integration.apiKey),
      publicApi: this.publicApi(),
      stats: {
        totalOrders: total,
        pendingOrders: pending,
        todayOrders: todayCount,
        lastOrderAt: lastOrder?.receivedAt ?? null,
        lastOrderNumber: lastOrder?.externalOrderNumber ?? null,
        productLinks: links,
        lastSyncAt: integration.lastSyncAt,
      },
      logs: [
        ...webhookLogs.map((l) => ({ id: l.id, kind: 'IN' as const, label: l.event, ok: l.processed, error: l.errorMessage, at: l.receivedAt })),
        ...pushLogs.map((l) => ({
          id: l.id, kind: l.direction === 'INBOUND' ? ('IN' as const) : ('OUT' as const),
          label: l.operation, ok: l.status === 'SUCCESS', error: l.errorMessage, at: l.startedAt,
        })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 12),
    };
  }

  async updateSettings(user: AuthenticatedUser, id: string, body: Partial<WebsiteConfig> & { displayName?: string }) {
    this.assertCanManage(user);
    const integration = await this.requireChannel(user.tenantId, id);
    await this.applySettings(integration, body, user.tenantId);
    return this.channelOverview(user, id);
  }

  /** Dashboard aur plugin dono yahi use karte hain */
  async applySettings(integration: any, body: Partial<WebsiteConfig> & { displayName?: string }, tenantId: string) {
    const current = readWebsiteConfig(integration.config);
    const next: WebsiteConfig = { ...current };

    if (body.autoAccept !== undefined) next.autoAccept = !!body.autoAccept;
    if (body.autoPrint !== undefined) next.autoPrint = !!body.autoPrint;
    if (body.requireSignature !== undefined) next.requireSignature = !!body.requireSignature;
    if (body.pushPrice !== undefined) next.pushPrice = !!body.pushPrice;
    if (body.priceSource !== undefined) next.priceSource = body.priceSource === 'NAFAA' ? 'NAFAA' : 'WEBSITE';
    if (body.platform !== undefined) next.platform = body.platform;
    if (body.siteUrl !== undefined) next.siteUrl = body.siteUrl ? String(body.siteUrl).slice(0, 300) : null;
    if (body.shopifySecret !== undefined) next.shopifySecret = body.shopifySecret ? String(body.shopifySecret).trim() : null;
    if (body.shopId !== undefined) next.shopId = await this.validShopId(tenantId, body.shopId ?? undefined);
    if (body.statusWebhookUrl !== undefined) {
      if (!body.statusWebhookUrl) next.statusWebhookUrl = null;
      else {
        try {
          next.statusWebhookUrl = assertSafeWebhookUrl(String(body.statusWebhookUrl));
        } catch (e: any) {
          throw new BadRequestException(`Status URL: ${e.message}`);
        }
      }
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        config: next as any,
        ...(body.shopId !== undefined && { shopId: next.shopId }),
        ...(body.displayName?.trim() && { displayName: body.displayName.trim().slice(0, 80) }),
      },
    });
    return next;
  }

  /** Key leak ho gayi? Nayi bana lo — purani foran band */
  async rotateKeys(user: AuthenticatedUser, id: string) {
    this.assertCanManage(user);
    const integration = await this.requireChannel(user.tenantId, id);
    const apiKey = 'nfk_' + crypto.randomBytes(24).toString('hex');
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        apiKey,
        webhookSecret: 'nfs_' + crypto.randomBytes(24).toString('hex'),
        webhookUrl: this.urls(apiKey).hook,
        webhookVerified: false,
      },
    });
    return this.prisma.integration.findUniqueOrThrow({ where: { id } });
  }

  async setActive(user: AuthenticatedUser, id: string, active: boolean) {
    this.assertCanManage(user);
    const integration = await this.requireChannel(user.tenantId, id);
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { isActive: active, status: active ? IntegrationStatus.CONNECTED : IntegrationStatus.DISCONNECTED },
    });
    return this.channelOverview(user, id);
  }

  /** Channel hatao — orders aur bills mehfooz rehte hain (sirf connection jata hai) */
  async removeChannel(user: AuthenticatedUser, id: string) {
    this.assertCanManage(user);
    const integration = await this.requireChannel(user.tenantId, id);
    const orders = await this.prisma.channelOrder.count({ where: { integrationId: id } });
    if (orders > 0) {
      // Orders ki history na mitay — sirf band karke chhupa do
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          isActive: false,
          status: IntegrationStatus.DISCONNECTED,
          credentials: Prisma.JsonNull as any,
          apiKey: null,
          webhookUrl: null,
        },
      });
      return { success: true, archived: true };
    }
    await this.prisma.integration.delete({ where: { id: integration.id } });
    return { success: true, archived: false };
  }

  async validShopId(tenantId: string, shopId?: string | null): Promise<string | null> {
    if (!shopId) {
      const main = await this.prisma.shop.findFirst({
        where: { tenantId, isActive: true },
        orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      return main?.id ?? null;
    }
    const shop = await this.prisma.shop.findFirst({ where: { id: shopId, tenantId, isActive: true }, select: { id: true } });
    if (!shop) throw new BadRequestException('Branch nahi mili');
    return shop.id;
  }

  /** Platform ke branch code → Nafaa branch (multi-branch online orders) */
  async saveBranchMap(user: AuthenticatedUser, id: string, map: Record<string, string | null>) {
    this.assertCanManage(user);
    const integration = await this.requireChannel(user.tenantId, id);
    const shopIds = new Set((await this.prisma.shop.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })).map((s) => s.id));
    const clean: Record<string, string> = {};
    for (const [code, shopId] of Object.entries(map ?? {})) if (shopId && shopIds.has(shopId)) clean[String(code).slice(0, 80)] = shopId;
    const cfg = (integration.config as any) ?? {};
    await this.prisma.integration.update({ where: { id: integration.id }, data: { config: { ...cfg, branchMap: clean } as any } });
    return { ok: true, branchMap: clean };
  }
}
