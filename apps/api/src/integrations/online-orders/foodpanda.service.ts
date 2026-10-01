import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Integration, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteSetupService } from './website-setup.service';
import { readWebsiteConfig } from './website-config';
import { ChannelStatus, channelStatusEvents } from './order-events';
import { FoodpandaMeta, acceptanceTime, normalizeFoodpanda, rejectReason, verifyMiddlewareJwt } from './foodpanda';

/* ═════════════════════════════════════════════════════════════
   FOODPANDA — Delivery Hero POS Middleware ("direct" integration).

   Delivery Hero → Nafaa (plugin, base URL /integrations/foodpanda/plugin):
     POST /order/:remoteId                         naya order (JWT HS512)
     PUT  /remoteId/:r/remoteOrder/:o/posOrderStatus  cancel / picked up …
     PUT  /remoteId/:r/availability                 dukaan band / khuli
     GET  /menuimport/:r                            menu ki darkhwast
   Nafaa → Delivery Hero (order ke callbackUrls par):
     accept (acceptanceTime) · reject (reason) · prepared · picked up

   Credentials Nafaa ki apni (sab restaurants ke liye ek): FOODPANDA_USERNAME,
   FOODPANDA_PASSWORD, FOODPANDA_SECRET, FOODPANDA_BASE_URL. Har restaurant
   sirf apna chain code + vendor code jorta hai; remoteId Nafaa banata hai.
   ═════════════════════════════════════════════════════════════ */

export interface FoodpandaVendor { remoteId: string; vendorCode: string; shopId: string | null; name?: string }
export interface FoodpandaConfig {
  chainCode: string;
  vendors: FoodpandaVendor[];
  /** JSON query ke liye — sab remoteIds */
  remoteIds: string[];
  prepMinutes: number;
  availability?: Record<string, { timestamp: string; closures: unknown[] }>;
  lastMenuImportRequest?: { remoteId: string; vendorCode?: string; menuImportId?: string; at: string } | null;
}

const STAGING = 'https://integration-middleware.stg.restaurant-partners.com';
const fpConfig = (cfg: unknown): FoodpandaConfig => {
  const f = ((cfg as any)?.foodpanda ?? {}) as Partial<FoodpandaConfig>;
  return { chainCode: f.chainCode ?? '', vendors: f.vendors ?? [], remoteIds: f.remoteIds ?? [], prepMinutes: f.prepMinutes ?? 20, availability: f.availability ?? {}, lastMenuImportRequest: f.lastMenuImportRequest ?? null };
};

@Injectable()
export class FoodpandaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FoodpandaService.name);
  private token: { value: string; until: number } | null = null;
  /** Order save hone se pehle accept aa jaye (auto-accept) to bhi callbackUrls milein */
  private pendingMeta = new Map<string, FoodpandaMeta>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly setup: WebsiteSetupService,
  ) {}

  private readonly onStatus = (e: ChannelStatus) => { void this.handleStatus(e).catch((err) => this.logger.warn(`Foodpanda status: ${err?.message ?? err}`)); };
  onModuleInit() { channelStatusEvents.on('status', this.onStatus); }
  onModuleDestroy() { channelStatusEvents.off('status', this.onStatus); }

  /* ─────────────────────────── ENV ─────────────────────────── */

  private env() {
    return {
      base: (process.env.FOODPANDA_BASE_URL || STAGING).replace(/\/+$/, ''),
      username: process.env.FOODPANDA_USERNAME ?? '',
      password: process.env.FOODPANDA_PASSWORD ?? '',
      secret: process.env.FOODPANDA_SECRET ?? '',
    };
  }
  configured() { const e = this.env(); return !!(e.username && e.password && e.secret); }
  pluginBaseUrl() {
    const api = (process.env.PUBLIC_API_URL || 'https://api.nafaa.pk/api').replace(/\/+$/, '');
    return `${api}/integrations/foodpanda/plugin`;
  }

  /* ─────────────────────── DH → NAFAA ─────────────────────── */

  private authorize(auth?: string) {
    if (!verifyMiddlewareJwt(auth, this.env().secret)) throw new UnauthorizedException({ reason: 'UNAUTHORIZED', message: 'Invalid token' });
  }

  private async integrationByRemote(remoteId: string) {
    const i = await this.prisma.integration.findFirst({
      where: { type: 'FOODPANDA', isActive: true, config: { path: ['foodpanda', 'remoteIds'], array_contains: [remoteId] } },
    });
    if (!i) throw new NotFoundException({ reason: 'UNKNOWN_REMOTE_ID', message: `remoteId ${remoteId} not found` });
    return i;
  }

  /** Naya order — jaldi save karo, remoteOrderId wapas (accept / reject baad me) */
  async dispatch(remoteId: string, auth: string | undefined, body: any) {
    this.authorize(auth);
    if (!body?.token || !Array.isArray(body?.products)) throw new BadRequestException({ reason: 'INVALID_ORDER', message: 'token and products are required' });
    const integration = await this.integrationByRemote(remoteId);

    // Dobara aaya (timeout / retry) — wahi order, naya nahi
    const existing = await this.prisma.channelOrder.findUnique({ where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId: String(body.token) } }, select: { id: true } });
    if (existing) return { remoteResponse: { remoteOrderId: existing.id } };

    const { order, meta } = normalizeFoodpanda(body);
    const vendor = fpConfig(integration.config).vendors.find((v) => v.remoteId === remoteId);
    const full = { ...meta, remoteId, vendorCode: vendor?.vendorCode ?? null };
    this.pendingMeta.set(meta.token, full as FoodpandaMeta);
    setTimeout(() => this.pendingMeta.delete(meta.token), 10 * 60_000).unref?.();

    const saved = await this.orders.receive(integration, order, { signed: true });
    const row = await this.prisma.channelOrder.findUnique({ where: { id: saved.id }, select: { metadata: true } });
    await this.prisma.channelOrder.update({
      where: { id: saved.id },
      data: {
        metadata: { ...((row?.metadata as any) ?? {}), foodpanda: full } as any,
        ...(vendor?.shopId && { shopId: vendor.shopId }),
      },
    });
    return { remoteResponse: { remoteOrderId: saved.id } };
  }

  private async orderFor(integration: Integration, remoteOrderId: string) {
    const o = await this.prisma.channelOrder.findFirst({ where: { id: remoteOrderId, integrationId: integration.id } });
    if (!o) throw new NotFoundException({ reason: 'ORDER_NOT_FOUND', message: 'remoteOrderId not found' });
    return o;
  }

  private async patchMeta(id: string, patch: Record<string, unknown>) {
    const row = await this.prisma.channelOrder.findUnique({ where: { id }, select: { metadata: true } });
    const meta = (row?.metadata as any) ?? {};
    await this.prisma.channelOrder.update({ where: { id }, data: { metadata: { ...meta, foodpanda: { ...(meta.foodpanda ?? {}), ...patch } } as any } });
  }

  /** Delivery Hero ka status: cancel, rider ne utha liya, rider pohncha… */
  async posOrderStatus(remoteId: string, remoteOrderId: string, auth: string | undefined, body: any) {
    this.authorize(auth);
    const integration = await this.integrationByRemote(remoteId);
    const order = await this.orderFor(integration, remoteOrderId);
    const status = String(body?.status ?? '');
    await this.patchMeta(order.id, { lastStatus: status, lastStatusAt: body?.occurredAt ?? new Date().toISOString(), lastMessage: body?.message ?? null });

    if (status === 'ORDER_CANCELLED') {
      // Pehle nishan — taake hamara cancel wapas "reject" ban kar Foodpanda na jaye
      await this.patchMeta(order.id, { cancelledByPlatform: true });
      await this.orders.applyWebsiteUpdate(integration, order.externalOrderId, { cancelled: true, reason: `Foodpanda: ${body?.message || 'order cancel hua'}` });
    } else if (status === 'ORDER_PICKED_UP' && order.nafaaSaleId && !['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)) {
      await this.patchMeta(order.id, { pickedUpByPlatform: true });
      const actor = await this.orders.systemActor(order.tenantId);
      await this.orders.updateStatus(actor, new ShopScope(null, true), order.id, { status: 'OUT_FOR_DELIVERY' }).catch(() => null);
    }
    return { ok: true };
  }

  async availability(remoteId: string, auth: string | undefined, body: any) {
    this.authorize(auth);
    const integration = await this.integrationByRemote(remoteId);
    const cfg = fpConfig(integration.config);
    const prev = cfg.availability?.[remoteId];
    // Purana (pehle wala) update dobara aaye to chhor do
    if (prev && body?.timestamp && Date.parse(prev.timestamp) > Date.parse(body.timestamp)) return { ok: true };
    cfg.availability = { ...(cfg.availability ?? {}), [remoteId]: { timestamp: body?.timestamp ?? new Date().toISOString(), closures: Array.isArray(body?.closures) ? body.closures : [] } };
    await this.saveConfig(integration, cfg);
    return { ok: true };
  }

  async menuImportRequest(remoteId: string, auth: string | undefined, q: { vendorCode?: string; menuImportId?: string }) {
    this.authorize(auth);
    const integration = await this.integrationByRemote(remoteId);
    const cfg = fpConfig(integration.config);
    cfg.lastMenuImportRequest = { remoteId, vendorCode: q.vendorCode, menuImportId: q.menuImportId, at: new Date().toISOString() };
    await this.saveConfig(integration, cfg);
    this.logger.log(`Foodpanda menu import request ${remoteId} (menu Foodpanda portal se chalta hai)`);
  }

  /* ─────────────────────── NAFAA → DH ─────────────────────── */

  private async accessToken(force = false) {
    if (!force && this.token && this.token.until > Date.now() + 60_000) return this.token.value;
    const e = this.env();
    const res = await fetch(`${e.base}/v2/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ username: e.username, password: e.password, grant_type: 'client_credentials' }).toString(),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || !j.access_token) throw new Error(`Foodpanda login fail (HTTP ${res.status})`);
    this.token = { value: j.access_token, until: Date.now() + Number(j.expires_in ?? 1800) * 1000 };
    return this.token.value;
  }

  private async callDh(url: string, body?: unknown) {
    const send = async (tok: string) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          ...(body !== undefined && { body: JSON.stringify(body) }),
          signal: ctrl.signal,
        });
        const text = await r.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 300) }; }
        return { status: r.status, body: json };
      } catch (e: any) {
        return { status: 0, body: { message: e?.name === 'AbortError' ? 'timeout' : e?.message } };
      } finally { clearTimeout(timer); }
    };
    let r = await send(await this.accessToken());
    if (r.status === 401) r = await send(await this.accessToken(true));
    return r;
  }

  /** Bhejo; 409 (order abhi tayyar nahi) / 429 / 5xx / network par thori der baad dobara */
  private async sendWithRetry(orderId: string, what: string, url: string, body: unknown, attempt = 0): Promise<void> {
    const r = await this.callDh(url, body);
    const ok = r.status >= 200 && r.status < 300;
    await this.patchMeta(orderId, { [`${what}Status`]: ok ? 'SENT' : `FAILED (${r.status})`, [`${what}At`]: new Date().toISOString(), ...(ok ? { [`${what}Error`]: null } : { [`${what}Error`]: String(r.body?.message ?? r.body?.reason ?? r.status) }) });
    if (ok) return;
    const retriable = r.status === 0 || r.status === 409 || r.status === 429 || r.status >= 500;
    if (retriable && attempt < 6) {
      const wait = r.status === 409 ? 10_000 : [5_000, 15_000, 30_000, 60_000, 120_000, 240_000][attempt];
      setTimeout(() => { void this.sendWithRetry(orderId, what, url, body, attempt + 1).catch(() => null); }, wait).unref?.();
    } else {
      this.logger.warn(`Foodpanda ${what} fail ${orderId}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    }
  }

  /** Nafaa me order ka status badla → Foodpanda ko */
  async handleStatus(e: ChannelStatus) {
    if (!this.configured()) return;
    const order = await this.prisma.channelOrder.findUnique({ where: { id: e.orderId }, include: { integration: true } });
    if (!order || order.integration.type !== 'FOODPANDA') return;
    const metaAll = (order.metadata as any) ?? {};
    const fp: FoodpandaMeta & Record<string, any> = metaAll.foodpanda ?? this.pendingMeta.get(order.externalOrderId);
    if (!fp) return;
    const urls = fp.callbackUrls ?? {};
    const cfg = fpConfig(order.integration.config);

    if (e.event === 'order.confirmed') {
      if (!urls.orderAcceptedUrl || fp.acceptStatus === 'SENT') return;
      await this.sendWithRetry(order.id, 'accept', urls.orderAcceptedUrl, {
        status: 'order_accepted', acceptanceTime: acceptanceTime(fp, cfg.prepMinutes), remoteOrderId: order.id,
      });
      return;
    }
    if (e.event === 'order.cancelled') {
      // Foodpanda ne khud cancel kiya tha — wapas mat bhejo
      if (fp.cancelledByPlatform || !urls.orderRejectedUrl || fp.rejectStatus === 'SENT') return;
      await this.sendWithRetry(order.id, 'reject', urls.orderRejectedUrl, {
        status: 'order_rejected', reason: rejectReason(order.cancelReason, fp.test), message: (order.cancelReason || 'Rejected by restaurant').slice(0, 200),
      });
      return;
    }
    if (e.event === 'order.status_changed') {
      // Khana tayyar — Foodpanda rider ko bulao
      if (order.orderStatus === 'READY' && fp.platformRider && urls.orderPreparedUrl && fp.preparedStatus !== 'SENT') {
        await this.sendWithRetry(order.id, 'prepared', urls.orderPreparedUrl, undefined);
      }
      // Apni delivery / pickup — customer ko de diya
      if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus) && !fp.platformRider && !fp.pickedUpByPlatform && urls.orderPickedUpUrl && fp.pickedUpStatus !== 'SENT') {
        await this.sendWithRetry(order.id, 'pickedUp', urls.orderPickedUpUrl, { status: 'order_picked_up' });
      }
    }
  }

  /* ───────────────────────── SETTINGS ───────────────────────── */

  private async saveConfig(integration: Integration, cfg: FoodpandaConfig) {
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: integration.id }, select: { config: true } });
    await this.prisma.integration.update({ where: { id: integration.id }, data: { config: { ...((fresh.config as any) ?? {}), foodpanda: cfg } as any } });
  }

  async overview(user: AuthenticatedUser) {
    this.setup.assertCanManage(user);
    const rows = await this.prisma.integration.findMany({ where: { tenantId: user.tenantId, type: 'FOODPANDA' }, orderBy: { createdAt: 'asc' } });
    const shops = await this.prisma.shop.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, name: true } });
    return {
      configured: this.configured(),
      environment: (process.env.FOODPANDA_BASE_URL || STAGING).includes('.stg.') ? 'staging' : 'production',
      pluginBaseUrl: this.pluginBaseUrl(),
      shops,
      channels: rows.map((r) => {
        const c = fpConfig(r.config);
        return {
          id: r.id, displayName: r.displayName, isActive: r.isActive, chainCode: c.chainCode, prepMinutes: c.prepMinutes,
          autoAccept: readWebsiteConfig(r.config).autoAccept, vendors: c.vendors, availability: c.availability,
          lastMenuImportRequest: c.lastMenuImportRequest,
        };
      }),
    };
  }

  async save(user: AuthenticatedUser, body: { channelId?: string; displayName?: string; chainCode?: string; prepMinutes?: number; autoAccept?: boolean; vendors?: Array<{ remoteId?: string; vendorCode?: string; shopId?: string | null; name?: string }> }) {
    this.setup.assertCanManage(user);
    const chainCode = String(body.chainCode ?? '').trim();
    if (!/^[a-z0-9][a-z0-9_-]{1,60}$/i.test(chainCode)) throw new BadRequestException('Chain code sahi likhein (Foodpanda se mila, jaise "yummy-pk")');
    const shopIds = new Set((await this.prisma.shop.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })).map((s) => s.id));
    const inVendors = Array.isArray(body.vendors) ? body.vendors.slice(0, 50) : [];
    if (!inVendors.length) throw new BadRequestException('Kam az kam ek branch (vendor code) jorein');

    const integration = body.channelId
      ? await this.prisma.integration.findFirst({ where: { id: body.channelId, tenantId: user.tenantId, type: 'FOODPANDA' } })
      : await this.setup.createChannel(user, { type: 'FOODPANDA', displayName: body.displayName?.trim() || 'Foodpanda', status: IntegrationStatus.CONNECTED });
    if (!integration) throw new NotFoundException('Foodpanda channel nahi mila');
    const cur = fpConfig(integration.config);

    const vendors: FoodpandaVendor[] = inVendors.map((v) => {
      const vendorCode = String(v.vendorCode ?? '').trim();
      if (!/^[A-Za-z0-9_-]{2,40}$/.test(vendorCode)) throw new BadRequestException('Vendor code sahi likhein (Foodpanda ka vendor code, jaise "s1ab")');
      const keep = cur.vendors.find((x) => x.remoteId === v.remoteId) ?? cur.vendors.find((x) => x.vendorCode === vendorCode);
      return {
        // remoteId Nafaa ka — ek dafa ban gaya to kabhi nahi badalta (Foodpanda isi se pehchanta hai)
        remoteId: keep?.remoteId ?? `nafaa-${crypto.randomBytes(5).toString('hex')}`,
        vendorCode, shopId: v.shopId && shopIds.has(v.shopId) ? v.shopId : null, name: String(v.name ?? '').trim().slice(0, 60) || undefined,
      };
    });
    if (new Set(vendors.map((v) => v.vendorCode)).size !== vendors.length) throw new BadRequestException('Ek vendor code do dafa');

    const prep = Math.round(Number(body.prepMinutes ?? cur.prepMinutes));
    const next: FoodpandaConfig = { ...cur, chainCode, vendors, remoteIds: vendors.map((v) => v.remoteId), prepMinutes: prep >= 5 && prep <= 120 ? prep : 20 };
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: integration.id }, select: { config: true } });
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        ...(body.displayName?.trim() && { displayName: body.displayName.trim().slice(0, 80) }),
        autoSyncEnabled: false,
        config: { ...((fresh.config as any) ?? {}), platform: 'foodpanda', ...(body.autoAccept !== undefined && { autoAccept: !!body.autoAccept }), foodpanda: next } as any,
      },
    });
    return this.overview(user);
  }

  async setActive(user: AuthenticatedUser, id: string, active: boolean) {
    this.setup.assertCanManage(user);
    const r = await this.prisma.integration.updateMany({ where: { id, tenantId: user.tenantId, type: 'FOODPANDA' }, data: { isActive: active } });
    if (!r.count) throw new NotFoundException('Foodpanda channel nahi mila');
    return this.overview(user);
  }
}
