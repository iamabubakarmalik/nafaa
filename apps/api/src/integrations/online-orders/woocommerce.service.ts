import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Integration, IntegrationStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { WebsiteCatalogService } from './website-catalog.service';
import { WebsiteSetupService } from './website-setup.service';
import { assertSafeWebhookUrl, readWebsiteConfig } from './website-config';
import { WooClient, WooError } from './woocommerce.client';

/**
 * WooCommerce — ek click me jorna (Shopify jaisa):
 *
 *  1. Dukandar site ka URL daalta hai → popup me unki WordPress site khulti hai
 *     (/wc-auth/v1/authorize). Login nahi to WordPress login maangta hai.
 *  2. "Approve" → WooCommerce khud API keys Nafaa ke callback par bhejta hai.
 *  3. Nafaa keys encrypt karke rakhta hai aur khud webhooks laga deta hai
 *     (order bana / badla / delete). Koi copy-paste nahi.
 *
 * Us ke baad sab REST API se: status wapas website par, stock har 15 min,
 * products dono taraf. Plugin ki zaroorat nahi (wo ab bhi chal sakta hai).
 */

const WOO_TOPICS = ['order.created', 'order.updated', 'order.deleted'] as const;

interface WooCreds { consumerKey: string; consumerSecret: string }

@Injectable()
export class WooCommerceService {
  private readonly logger = new Logger(WooCommerceService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: WebsiteCatalogService,
    private readonly setup: WebsiteSetupService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // CONNECT — popup ka URL
  // ═══════════════════════════════════════════════════════════

  async start(user: AuthenticatedUser, body: { siteUrl: string; displayName?: string; shopId?: string; channelId?: string; returnOrigin?: string }) {
    this.setup.assertCanManage(user);
    const siteUrl = this.normalizeSite(body.siteUrl);

    let integration: Integration;
    if (body.channelId) {
      integration = await this.setup.requireChannel(user.tenantId, body.channelId);
      const cfg = readWebsiteConfig(integration.config);
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { config: { ...cfg, siteUrl, platform: 'woocommerce' } as any },
      });
    } else {
      // Isi site ka connection pehle se hai to wahi dobara jorein (naya na banayein)
      const same = (await this.prisma.integration.findMany({ where: { tenantId: user.tenantId, type: 'WOOCOMMERCE' } }))
        .find((i) => readWebsiteConfig(i.config).siteUrl === siteUrl);
      integration = same ?? await this.setup.createChannel(user, {
        type: 'WOOCOMMERCE',
        displayName: body.displayName?.trim() || new URL(siteUrl).hostname.replace(/^www\./, ''),
        shopId: body.shopId,
        siteUrl,
        status: IntegrationStatus.PENDING,
      });
    }

    const api = this.setup.apiBase();
    // WooCommerce callback sirf https par bhejta hai — warna wahan
    // "callback_url needs to be over SSL" aata. Popup ke bajaye keys wala raasta.
    const pub = this.setup.publicApi();
    if (!pub.reachable) {
      return { channelId: integration.id, authUrl: null, siteUrl, needsHttps: true, reason: pub.reason, fix: pub.fix };
    }
    const web = this.webOrigin(body.returnOrigin);
    const params = new URLSearchParams({
      app_name: 'Nafaa POS',
      scope: 'read_write',
      user_id: this.signState(integration.id),
      return_url: `${web}/connect/woocommerce/done?channel=${integration.id}`,
      callback_url: `${api}/integrations/website/v1/woocommerce/callback`,
    });

    return {
      channelId: integration.id,
      authUrl: `${siteUrl}/wc-auth/v1/authorize?${params.toString()}` as string | null,
      siteUrl,
      needsHttps: false,
      reason: null as string | null,
      fix: null as string | null,
    };
  }

  /** WooCommerce keys yahan POST karta hai (public — state signature se pehchan) */
  async callback(body: any) {
    const state = String(body?.user_id ?? '');
    const id = this.verifyState(state);
    const ck = String(body?.consumer_key ?? '');
    const cs = String(body?.consumer_secret ?? '');
    if (!ck.startsWith('ck_') || !cs.startsWith('cs_')) throw new BadRequestException('Keys nahi mili');

    const integration = await this.prisma.integration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException('Connection nahi mila');

    await this.saveCredentials(integration, { consumerKey: ck, consumerSecret: cs }, String(body?.key_permissions ?? 'read_write'));

    // WooCommerce is jawab ka intezar karta hai — webhooks baad me lagao
    setTimeout(() => {
      this.afterConnect(id).catch((e) => this.logger.warn(`Woo setup fail: ${e?.message}`));
    }, 500);
    return { success: true };
  }

  /** Popup band ho gaya / block tha → malik khud keys daal de (WooCommerce → Settings → Advanced → REST API) */
  async connectWithKeys(user: AuthenticatedUser, channelId: string, body: { consumerKey: string; consumerSecret: string; siteUrl?: string }) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readWebsiteConfig(integration.config);
    const siteUrl = this.normalizeSite(body.siteUrl || cfg.siteUrl || '');
    const creds = { consumerKey: body.consumerKey?.trim(), consumerSecret: body.consumerSecret?.trim() };
    if (!creds.consumerKey?.startsWith('ck_') || !creds.consumerSecret?.startsWith('cs_')) {
      throw new BadRequestException('Consumer key "ck_" aur secret "cs_" se shuru hota hai');
    }
    try {
      await new WooClient(siteUrl, creds.consumerKey, creds.consumerSecret).ping();
    } catch (e: any) {
      throw new BadRequestException(`WooCommerce ne keys qubool nahi ki: ${e.message}`);
    }
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { config: { ...cfg, siteUrl, platform: 'woocommerce' } as any },
    });
    await this.saveCredentials(integration, creds as WooCreds, 'read_write');
    await this.afterConnect(integration.id);
    return this.setup.channelOverview(user, integration.id);
  }

  private async saveCredentials(integration: Integration, creds: WooCreds, permissions: string) {
    const cfg = readWebsiteConfig(integration.config);
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        credentials: {
          wooKey: encrypt(creds.consumerKey),
          wooSecret: encrypt(creds.consumerSecret),
          wooPermissions: permissions,
          wooConnectedAt: new Date().toISOString(),
        },
        config: { ...cfg, platform: 'woocommerce' } as any,
        status: IntegrationStatus.CONNECTED,
        isActive: true,
      },
    });
  }

  /** Webhooks lagao + pehla stock sync */
  async afterConnect(id: string) {
    const integration = await this.prisma.integration.findUniqueOrThrow({ where: { id } });
    const res = await this.installWebhooks(integration);
    await this.log(integration, 'WOO_CONNECT', res.ok, res.error, { installed: res.installed });
    this.syncStock(integration).catch(() => null);
  }

  async installWebhooks(integration: Integration) {
    const client = this.client(integration);
    const hook = this.setup.urls(integration.apiKey).hook;
    if (!client || !hook || !integration.webhookSecret) return { ok: false, installed: 0, error: 'Keys nahi hain' };
    try {
      const existing = await client.all<any>('/webhooks', {}, 5);
      let installed = 0;
      for (const topic of WOO_TOPICS) {
        const mine = existing.filter((w) => w.topic === topic && String(w.delivery_url ?? '').includes('/integrations/website/v1/hook/'));
        const current = mine.find((w) => w.delivery_url === hook && w.status === 'active');
        // Purani key wale Nafaa webhooks hata do (key badli thi)
        for (const w of mine) if (w !== current) await client.request('DELETE', `/webhooks/${w.id}`, { query: { force: 'true' } }).catch(() => null);
        if (current) {
          await client.request('PUT', `/webhooks/${current.id}`, { body: { secret: integration.webhookSecret } }).catch(() => null);
          continue;
        }
        await client.request('POST', '/webhooks', {
          body: { name: `Nafaa POS — ${topic}`, topic, delivery_url: hook, secret: integration.webhookSecret, status: 'active' },
        });
        installed++;
      }
      await this.prisma.integration.update({ where: { id: integration.id }, data: { webhookVerified: true } });
      return { ok: true, installed };
    } catch (e: any) {
      return { ok: false, installed: 0, error: e?.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS — Nafaa → WooCommerce order
  // ═══════════════════════════════════════════════════════════

  isConnected(integration: Integration) {
    return integration.type === 'WOOCOMMERCE' && !!(integration.credentials as any)?.wooKey;
  }

  async pushStatus(integration: Integration, order: any, event: string) {
    const client = this.client(integration);
    if (!client || !/^\d+$/.test(String(order.externalOrderId))) return;
    const wooId = order.externalOrderId;
    const status: string = order.orderStatus;
    const tracking = [order.courierName, order.trackingNumber].filter(Boolean).join(' ');

    const map: Record<string, string> = { CONFIRMED: 'processing', DELIVERED: 'completed', CANCELLED: 'cancelled', REJECTED: 'cancelled' };
    const notes: Record<string, { text: string; customer: boolean }> = {
      CONFIRMED: { text: 'Nafaa: order accept ho gaya, bill ban gaya', customer: false },
      PREPARING: { text: 'Nafaa: order pack ho raha hai', customer: false },
      READY: { text: 'Nafaa: order pack ho gaya', customer: false },
      OUT_FOR_DELIVERY: { text: `Aap ka order raste me hai${tracking ? ` — ${tracking}` : ''}`, customer: true },
      DELIVERED: { text: 'Nafaa: order deliver ho gaya', customer: false },
      CANCELLED: { text: `Nafaa: order cancel${order.cancelReason ? ` (${order.cancelReason})` : ''}`, customer: false },
      REJECTED: { text: `Nafaa: order reject${order.cancelReason ? ` (${order.cancelReason})` : ''}`, customer: false },
    };

    let ok = true;
    let error: string | undefined;
    try {
      if (event === 'order.paid') {
        await client.request('POST', `/orders/${wooId}/notes`, { body: { note: 'Nafaa: paisa mil gaya' } });
      } else {
        if (map[status]) {
          const current = await client.request<any>('GET', `/orders/${wooId}`, { query: { _fields: 'status' } });
          if (current?.status !== map[status]) {
            await client.request('PUT', `/orders/${wooId}`, { body: { status: map[status] } });
          }
        }
        const n = notes[status];
        if (n) await client.request('POST', `/orders/${wooId}/notes`, { body: { note: n.text, customer_note: n.customer } });
      }
    } catch (e: any) {
      ok = false;
      error = e?.message;
    }
    await this.log(integration, `STATUS_PUSH:${status}`, ok, error, { orderId: wooId });

    // Accept/cancel se stock badla — website par foran lagao
    if (['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(status)) {
      const skus = ((order.items as any[]) ?? []).map((i) => i?.sku).filter(Boolean);
      if (skus.length) this.syncStock(integration, { onlySkus: skus }).catch(() => null);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STOCK — Nafaa → WooCommerce (har 15 minute + accept/cancel par)
  // ═══════════════════════════════════════════════════════════

  @Cron('0 */15 * * * *')
  async syncAll() {
    if (this.running || process.env.DISABLE_WOO_SYNC === '1') return;
    this.running = true;
    try {
      const list = await this.prisma.integration.findMany({
        where: { type: 'WOOCOMMERCE', isActive: true, status: IntegrationStatus.CONNECTED },
      });
      for (const i of list) {
        if (!this.isConnected(i)) continue;
        await this.syncStock(i).catch((e) => this.logger.warn(`Woo stock sync ${i.displayName}: ${e?.message}`));
      }
    } finally {
      this.running = false;
    }
  }

  async syncStock(integration: Integration, opts: { onlySkus?: string[] } = {}) {
    const client = this.client(integration);
    if (!client) throw new BadRequestException('WooCommerce jura nahi — pehle connect karein');
    const cfg = readWebsiteConfig(integration.config);
    const shopId = cfg.shopId ?? integration.shopId;

    // Website ke products + variations (id, sku, stock)
    type Row = { id: number; parentId?: number; sku: string; stock: number | null; manage: boolean };
    const rows: Row[] = [];
    if (opts.onlySkus?.length) {
      for (const sku of [...new Set(opts.onlySkus)].slice(0, 30)) {
        const found = await client.request<any[]>('GET', '/products', { query: { sku, _fields: 'id,sku,type,parent_id,manage_stock,stock_quantity' } }).catch(() => []);
        for (const p of found ?? []) {
          rows.push({ id: p.id, parentId: p.type === 'variation' ? p.parent_id : undefined, sku: p.sku, stock: p.stock_quantity, manage: !!p.manage_stock });
        }
      }
    } else {
      const products = await client.all<any>('/products', { _fields: 'id,sku,type,manage_stock,stock_quantity', status: 'any' }, 30);
      for (const p of products) {
        if (p.type === 'variable') {
          const vars = await client.all<any>(`/products/${p.id}/variations`, { _fields: 'id,sku,manage_stock,stock_quantity' }, 3).catch(() => []);
          for (const v of vars) if (v.sku) rows.push({ id: v.id, parentId: p.id, sku: v.sku, stock: v.stock_quantity, manage: !!v.manage_stock });
        } else if (p.sku) {
          rows.push({ id: p.id, sku: p.sku, stock: p.stock_quantity, manage: !!p.manage_stock });
        }
      }
    }

    const skus = [...new Set(rows.map((r) => r.sku).filter(Boolean))];
    if (!skus.length) {
      await this.log(integration, 'STOCK_SYNC', true, undefined, { updated: 0, note: 'SKU wala koi product nahi' });
      return { updated: 0, checked: 0, missing: 0 };
    }
    const stock = await this.catalog.stockBySku(integration.tenantId, shopId, integration.id, skus);

    const simple: any[] = [];
    const byParent = new Map<number, any[]>();
    let missing = 0;
    for (const r of rows) {
      const want = stock[r.sku];
      if (want === undefined) { missing++; continue; }
      const qty = Math.max(0, Math.floor(want));
      if (r.manage && r.stock === qty) continue;
      const patch = { id: r.id, manage_stock: true, stock_quantity: qty };
      if (r.parentId) byParent.set(r.parentId, [...(byParent.get(r.parentId) ?? []), patch]);
      else simple.push(patch);
    }

    let updated = 0;
    for (let i = 0; i < simple.length; i += 100) {
      await client.request('POST', '/products/batch', { body: { update: simple.slice(i, i + 100) }, timeoutMs: 60_000 });
      updated += Math.min(100, simple.length - i);
    }
    for (const [parent, list] of byParent) {
      await client.request('POST', `/products/${parent}/variations/batch`, { body: { update: list }, timeoutMs: 60_000 });
      updated += list.length;
    }

    await this.prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date(), lastSyncStatus: 'SUCCESS' } });
    await this.log(integration, 'STOCK_SYNC', true, undefined, { updated, checked: rows.length, missing });
    return { updated, checked: rows.length, missing };
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCTS — dono taraf
  // ═══════════════════════════════════════════════════════════

  /** WooCommerce → Nafaa */
  async importFromWoo(user: AuthenticatedUser, channelId: string, opts: { updatePrice?: boolean; updateStock?: boolean }) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const client = this.mustClient(integration);
    const products = await client.all<any>('/products', {
      status: 'publish',
      _fields: 'id,name,sku,type,regular_price,price,stock_quantity,manage_stock,description,short_description,categories,images',
    }, 40);
    const cfg = readWebsiteConfig(integration.config);
    const rows = products.map((p) => ({
      id: String(p.id),
      name: p.name,
      sku: p.sku || undefined,
      price: p.regular_price || p.price,
      stock: p.manage_stock ? p.stock_quantity : undefined,
      description: String(p.short_description || p.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || undefined,
      category: p.categories?.[0]?.name,
      images: (p.images ?? []).map((i: any) => i.src),
    }));
    const res = await this.catalog.importProducts(integration, rows, {
      shopId: cfg.shopId ?? integration.shopId,
      updatePrice: !!opts.updatePrice,
      updateStock: !!opts.updateStock,
    });
    await this.log(integration, 'PRODUCTS_IMPORT', true, undefined, { imported: res.imported, updated: res.updated });
    return res;
  }

  /** Nafaa → WooCommerce: jo SKU website par nahi, wo ban jayen; jo hain un ki qeemat/stock */
  async exportToWoo(user: AuthenticatedUser, channelId: string, opts: { updatePrice?: boolean }) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const client = this.mustClient(integration);
    const cfg = readWebsiteConfig(integration.config);
    const shopId = cfg.shopId ?? integration.shopId;

    const [nafaa, woo] = await Promise.all([
      this.catalog.exportAll(integration.tenantId, shopId),
      client.all<any>('/products', { _fields: 'id,sku', status: 'any' }, 40),
    ]);
    const wooBySku = new Map(woo.filter((w) => w.sku).map((w) => [String(w.sku), w.id]));

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];
    const creates: any[] = [];
    const creatingFor: any[] = [];
    const updates: any[] = [];

    for (const p of nafaa) {
      const sku = p.sku || `NF-${p.id.slice(0, 8)}`;
      const existingId = wooBySku.get(sku);
      if (existingId) {
        if (opts.updatePrice && !p.variants.length) updates.push({ id: existingId, regular_price: String(p.price) });
        await this.link(integration.id, p.id, String(existingId), sku);
        continue;
      }
      if (p.variants.length) {
        // Variants wala product — parent + variations alag banta hai
        try {
          const parent = await client.request<any>('POST', '/products', {
            body: {
              name: p.name, type: 'variable', sku, description: p.description ?? '', short_description: p.shortDescription ?? '',
              images: p.images.slice(0, 5).map((src: string) => ({ src })),
              attributes: [{ name: 'Option', visible: true, variation: true, options: p.variants.map((v: any) => v.name) }],
            },
            timeoutMs: 60_000,
          });
          await client.request('POST', `/products/${parent.id}/variations/batch`, {
            body: {
              create: p.variants.map((v: any) => ({
                sku: v.sku || undefined, regular_price: String(v.price), manage_stock: true, stock_quantity: Math.floor(v.stock),
                attributes: [{ name: 'Option', option: v.name }],
              })),
            },
            timeoutMs: 60_000,
          });
          await this.link(integration.id, p.id, String(parent.id), sku);
          created++;
        } catch (e: any) {
          failed++;
          if (errors.length < 10) errors.push(`${p.name}: ${e.message}`);
        }
        continue;
      }
      creates.push({
        name: p.name, type: 'simple', sku, regular_price: String(p.price),
        description: p.description ?? '', short_description: p.shortDescription ?? '',
        manage_stock: true, stock_quantity: Math.floor(p.stock),
        images: p.images.slice(0, 5).map((src: string) => ({ src })),
      });
      creatingFor.push(p);
    }

    for (let i = 0; i < creates.length; i += 50) {
      const chunk = creates.slice(i, i + 50);
      try {
        const res = await client.request<any>('POST', '/products/batch', { body: { create: chunk }, timeoutMs: 120_000 });
        (res?.create ?? []).forEach((r: any, k: number) => {
          if (r?.id) {
            created++;
            const src = creatingFor[i + k];
            if (src) this.link(integration.id, src.id, String(r.id), chunk[k].sku).catch(() => null);
          } else {
            failed++;
            if (errors.length < 10) errors.push(`${chunk[k].name}: ${r?.error?.message ?? 'ban nahi saka'}`);
          }
        });
      } catch (e: any) {
        failed += chunk.length;
        if (errors.length < 10) errors.push(e.message);
      }
    }
    for (let i = 0; i < updates.length; i += 100) {
      await client.request('POST', '/products/batch', { body: { update: updates.slice(i, i + 100) }, timeoutMs: 60_000 })
        .then(() => { updated += Math.min(100, updates.length - i); })
        .catch(() => { failed += Math.min(100, updates.length - i); });
    }

    await this.log(integration, 'PRODUCTS_EXPORT', failed === 0, errors[0], { created, updated, failed });
    return { created, updated, failed, total: nafaa.length, errors };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private async link(integrationId: string, productId: string, externalId: string, sku?: string) {
    await this.prisma.productChannelMapping.upsert({
      where: { integrationId_productId: { integrationId, productId } },
      create: { integrationId, productId, externalProductId: externalId, externalSku: sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
      update: { externalProductId: externalId, externalSku: sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
    }).catch(() => null);
  }

  client(integration: Integration): WooClient | null {
    const c = (integration.credentials ?? {}) as any;
    const siteUrl = readWebsiteConfig(integration.config).siteUrl;
    const key = decrypt(c.wooKey);
    const secret = decrypt(c.wooSecret);
    if (!siteUrl || !key || !secret) return null;
    return new WooClient(siteUrl, key, secret);
  }

  private mustClient(integration: Integration) {
    const c = this.client(integration);
    if (!c) throw new BadRequestException('WooCommerce jura nahi — pehle "WooCommerce se jorein" dabayein');
    return c;
  }

  normalizeSite(raw: string): string {
    let s = String(raw ?? '').trim();
    if (!s) throw new BadRequestException('Website ka URL daalein');
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      throw new BadRequestException('Website ka URL sahi nahi');
    }
    const clean = `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`;
    try {
      assertSafeWebhookUrl(clean);
    } catch (e: any) {
      throw new BadRequestException(`Website: ${e.message}`);
    }
    return clean;
  }

  /** WooCommerce popup ke baad kahan wapas aana hai — sirf apne hi domain */
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

  private signState(id: string) {
    const exp = Date.now() + 60 * 60_000;
    const payload = `${id}.${exp}`;
    const sig = crypto.createHmac('sha256', this.secret()).update(payload).digest('hex').slice(0, 32);
    return `${payload}.${sig}`;
  }

  private verifyState(state: string) {
    const [id, exp, sig] = state.split('.');
    if (!id || !exp || !sig) throw new UnauthorizedException('Ghalat request');
    const expected = crypto.createHmac('sha256', this.secret()).update(`${id}.${exp}`).digest('hex').slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new UnauthorizedException('Ghalat request');
    if (Date.now() > Number(exp)) throw new UnauthorizedException('Link purana ho gaya — dobara connect karein');
    return id;
  }

  private async log(integration: Integration, operation: string, ok: boolean, error?: string, details?: any) {
    await this.prisma.syncLog.create({
      data: {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        operation,
        direction: operation.startsWith('PRODUCTS_IMPORT') ? 'INBOUND' : 'OUTBOUND',
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

export { WooError };
