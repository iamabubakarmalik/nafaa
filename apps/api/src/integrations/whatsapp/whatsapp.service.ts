/**
 * WhatsApp Cloud API for online orders.
 *
 * The shop connects its WhatsApp Business Account and phone number through
 * the Facebook connection (MetaConnection.wabaId / waPhoneNumberId; every
 * call goes through MetaGraphService). Nafaa's WhatsApp texts are submitted
 * as message templates and their review state is kept in sync. Order events
 * send a template: order received → confirmation with "Haan confirm" /
 * "Cancel" buttons, dispatched with tracking, delivered with thanks.
 *
 * The shared Meta webhook (signature checked in MetaController) records delivery states, sets the order's
 * confirmation from a button reply (the basic "WhatsApp bot"), and puts free
 * text replies in the Facebook & Instagram inbox (platform WHATSAPP) and in
 * the shop's WhatsApp message list.
 *
 * Messages are charged by Meta on the shop's own WhatsApp account.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import { Prisma, WhatsappConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { apiText } from '../../common/i18n/api-message';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { IntegrationService } from '../core/integration.service';
import { MetaGraphService } from '../meta/meta-graph.service';
import { metaAccess } from '../meta/meta-access';
import type { MetaInboxService } from '../meta/meta-inbox.service';
import type { OnlineOrdersService } from '../online-orders/online-orders.service';
import { OrderStatusEvent, orderEvents } from '../online-orders/order-events';
import { appendTimeline } from '../online-orders/order-metadata';
import { orderMoney } from '../online-orders/order-money';
import { normalizeWaTemplates } from '../online-orders/growth-math';
import {
  CONFIRM_BUTTONS, WA_CATEGORY, WA_CLOUD_KEYS, WA_DEFAULT_TEXT, WA_TEMPLATE_NAME, WaCloudKey, WaInbound, confirmPayload, costEstimate, orderValues,
  parseWaWebhook, replyResult, templateCreatePayload, templateDraft, templateSendPayload, textSendPayload, waNumber,
} from './wa-cloud';

const MANAGERS = ['OWNER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
/** Wait after a new order so the block list and auto-accept hooks run first. */
const RECEIVED_DELAY_MS = 20_000;
const TEXTED_TAG = 'Texted';
/** Same key as CommerceGrowthService (the shop's wa.me texts). */
const waTextsKey = (tenantId: string) => `online_wa_templates:${tenantId}`;
const EVENT_OF_STATUS: Record<string, WaCloudKey> = { OUT_FOR_DELIVERY: 'dispatched', DELIVERED: 'delivered' };

@Injectable()
export class WhatsappService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('WhatsAppCloud');

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly moduleRef: ModuleRef,
    private readonly integrations: IntegrationService,
  ) {}

  /**
   * OnlineOrdersService, looked up when first needed. A file-level import
   * would change the load order of the online-orders files and break their
   * own import cycle (DarazService ↔ OnlineOrdersService).
   */
  private ordersRef: OnlineOrdersService | null = null;
  private async orders(): Promise<OnlineOrdersService> {
    if (!this.ordersRef) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { OnlineOrdersService: Svc } = require('../online-orders/online-orders.service') as { OnlineOrdersService: new (...a: any[]) => OnlineOrdersService };
      this.ordersRef = this.moduleRef.get(Svc, { strict: false });
    }
    return this.ordersRef as OnlineOrdersService;
  }

  /* ───────────────────────── events ───────────────────────── */

  private readonly onStatus = (e: OrderStatusEvent) => {
    const key = EVENT_OF_STATUS[e.status];
    if (key) this.sendForOrder(e.tenantId, e.orderId, key).catch((err) => this.logger.warn(`WA ${key} ${e.orderId}: ${err?.response?.message ?? err?.message ?? err}`));
  };

  onModuleInit() {
    orderEvents.on('status', this.onStatus);
    this.integrations.onOrderReceived((order) => {
      if ((order?.metadata as any)?.imported || (order?.metadata as any)?.test) return;
      setTimeout(() => {
        this.sendForOrder(order.tenantId, order.id, 'confirm').catch((err) => this.logger.warn(`WA confirm ${order.id}: ${err?.response?.message ?? err?.message ?? err}`));
      }, RECEIVED_DELAY_MS);
    });
  }

  /** Hooks into the shared Meta webhook and the inbox reply box. */
  onApplicationBootstrap() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MetaInboxService: Inbox } = require('../meta/meta-inbox.service') as { MetaInboxService: new (...a: any[]) => MetaInboxService };
      const inbox = this.moduleRef.get(Inbox, { strict: false });
      inbox.registerWebhookHandler('whatsapp_business_account', (body) => this.handle(body));
      inbox.registerReplySender('WHATSAPP', (tenantId, to, text, userId) => this.sendText(tenantId, to, text, userId));
    } catch (e) {
      this.logger.warn(`Meta inbox not available: ${(e as Error).message}`);
    }
  }

  onModuleDestroy() {
    orderEvents.off('status', this.onStatus);
  }

  /* ───────────────────────── setup ───────────────────────── */

  private assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Ye kaam sirf malik ya manager kar sakte hain');
  }

  private async live(tenantId: string) {
    const access = await metaAccess(this.prisma, tenantId);
    if (!access.live) throw new ForbiddenException(access.reason === 'paused' ? 'WhatsApp ka kaam Nafaa ne thori der ke liye rok rakha hai' : 'WhatsApp Business abhi aap ki dukaan ke liye jald aa raha hai');
    return access;
  }

  /** The shop's active config with its connection ids, or null. */
  private async active(tenantId: string): Promise<(WhatsappConfig & { wabaId: string }) | null> {
    const [cfg, conn] = await Promise.all([
      this.prisma.whatsappConfig.findUnique({ where: { tenantId } }),
      this.graph.connection(tenantId),
    ]);
    if (!cfg?.isActive || !conn?.wabaId || !conn.waPhoneNumberId || conn.waPhoneNumberId !== cfg.phoneNumberId) return null;
    return { ...cfg, wabaId: conn.wabaId };
  }

  /** Page data: access, connection, settings, templates, numbers for the last 30 days and the cost estimate. */
  async status(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [access, conn, cfg, templates, sent, replies, confirmed, codOrders, allOrders, delivered, dispatched] = await Promise.all([
      metaAccess(this.prisma, tenantId),
      this.graph.connection(tenantId),
      this.prisma.whatsappConfig.findUnique({ where: { tenantId } }),
      this.prisma.whatsappTemplate.findMany({ where: { tenantId, templateKey: { not: null } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.whatsappMessage.groupBy({ by: ['event'], where: { tenantId, direction: 'OUT', createdAt: { gte: since }, status: { not: 'FAILED' } }, _count: { _all: true } }),
      this.prisma.whatsappMessage.count({ where: { tenantId, direction: 'IN', createdAt: { gte: since } } }),
      this.prisma.whatsappMessage.groupBy({ by: ['payload'], where: { tenantId, direction: 'IN', event: 'confirm', createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.channelOrder.count({ where: { tenantId, receivedAt: { gte: since }, deletedAt: null, metadata: { path: ['cod'], equals: true } } }),
      this.prisma.channelOrder.count({ where: { tenantId, receivedAt: { gte: since }, deletedAt: null } }),
      this.prisma.channelOrder.count({ where: { tenantId, deliveredAt: { gte: since } } }),
      this.prisma.channelOrder.count({ where: { tenantId, dispatchedAt: { gte: since } } }),
    ]);
    const connected = !!(cfg?.isActive && conn?.waPhoneNumberId && conn.waPhoneNumberId === cfg.phoneNumberId);
    const yes = confirmed.filter((c) => String(c.payload ?? '').startsWith('nafaa:yes:')).reduce((s, c) => s + c._count._all, 0);
    const no = confirmed.filter((c) => String(c.payload ?? '').startsWith('nafaa:no:')).reduce((s, c) => s + c._count._all, 0);
    const perMonth = {
      confirm: cfg?.sendConfirm === false ? 0 : cfg?.confirmCodOnly === false ? allOrders : codOrders,
      dispatched: cfg?.sendDispatched === false ? 0 : dispatched,
      delivered: cfg?.sendDelivered ? delivered : 0,
    };
    return {
      access,
      facebookConnected: !!conn?.userToken && conn.status === 'CONNECTED',
      connected,
      number: cfg ? { phoneNumberId: cfg.phoneNumberId, wabaId: cfg.businessId, displayPhone: cfg.displayPhone, name: cfg.displayName, quality: cfg.qualityRating } : null,
      settings: cfg ? { language: cfg.language, sendConfirm: cfg.sendConfirm, confirmCodOnly: cfg.confirmCodOnly, sendDispatched: cfg.sendDispatched, sendDelivered: cfg.sendDelivered } : null,
      lastError: cfg?.lastError ?? null,
      templates: WA_CLOUD_KEYS.map((key) => {
        const t = templates.find((x) => x.templateKey === key && x.language === (cfg?.language ?? 'en'));
        return { key, name: WA_TEMPLATE_NAME[key], category: WA_CATEGORY[key], status: t?.status ?? 'NOT_SUBMITTED', rejectedReason: t?.rejectedReason ?? null, body: t?.bodyText ?? null, syncedAt: t?.syncedAt ?? null };
      }),
      last30: {
        sent: Object.fromEntries(sent.map((s) => [s.event ?? 'other', s._count._all])),
        replies, confirmedYes: yes, confirmedNo: no,
      },
      estimate: { perMonth, ...costEstimate(perMonth) },
    };
  }

  /** WhatsApp accounts and numbers the Facebook connection can use. */
  async numbers(user: AuthenticatedUser) {
    this.assertManager(user);
    await this.live(user.tenantId);
    const conn = await this.graph.connection(user.tenantId);
    let businesses = (Array.isArray(conn?.businesses) ? (conn!.businesses as any[]) : []).map((b) => String(b?.id ?? '')).filter(Boolean);
    if (!businesses.length) businesses = (await this.graph.callAll(user.tenantId, { path: 'me/businesses', params: { fields: 'id,name', limit: 50 } }, 50)).map((b: any) => String(b.id));
    const wabas: Array<{ id: string; name: string }> = [];
    for (const b of businesses.slice(0, 10)) {
      for (const edge of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
        const rows = await this.graph.callAll(user.tenantId, { path: `${b}/${edge}`, params: { fields: 'id,name', limit: 50 } }, 50).catch(() => []);
        for (const w of rows as any[]) if (w?.id && !wabas.some((x) => x.id === String(w.id))) wabas.push({ id: String(w.id), name: String(w.name ?? w.id) });
      }
    }
    const out = [];
    for (const w of wabas.slice(0, 20)) {
      const phones = await this.graph.callAll(user.tenantId, { path: `${w.id}/phone_numbers`, params: { fields: 'id,display_phone_number,verified_name,quality_rating', limit: 50 } }, 50).catch(() => []);
      out.push({ ...w, phones: (phones as any[]).map((p) => ({ id: String(p.id), displayPhone: String(p.display_phone_number ?? ''), name: String(p.verified_name ?? ''), quality: p.quality_rating ?? null })) });
    }
    return { accounts: out };
  }

  /** Saves the chosen account and number, and subscribes Nafaa to its webhooks. */
  async connect(user: AuthenticatedUser, b: { wabaId?: string; phoneNumberId?: string }) {
    this.assertManager(user);
    await this.live(user.tenantId);
    const wabaId = String(b?.wabaId ?? '');
    const phoneNumberId = String(b?.phoneNumberId ?? '');
    if (!/^\d{5,25}$/.test(wabaId) || !/^\d{5,25}$/.test(phoneNumberId)) throw new BadRequestException('WhatsApp account aur number chunein');
    const phones = await this.graph.callAll(user.tenantId, { path: `${wabaId}/phone_numbers`, params: { fields: 'id,display_phone_number,verified_name,quality_rating', limit: 50 } }, 50);
    const phone = (phones as any[]).find((p) => String(p.id) === phoneNumberId);
    if (!phone) throw new NotFoundException('Ye number is WhatsApp account me nahi mila');
    await this.graph.call(user.tenantId, { method: 'POST', path: `${wabaId}/subscribed_apps` });
    await this.prisma.metaConnection.update({ where: { tenantId: user.tenantId }, data: { wabaId, waPhoneNumberId: phoneNumberId } });
    const data = {
      phoneNumberId, businessId: wabaId, isActive: true, isVerified: true,
      displayPhone: String(phone.display_phone_number ?? '') || null, displayName: String(phone.verified_name ?? '') || null, qualityRating: phone.quality_rating ?? null,
      lastError: null, lastErrorAt: null,
    };
    await this.prisma.whatsappConfig.upsert({ where: { tenantId: user.tenantId }, create: { tenantId: user.tenantId, ...data }, update: data });
    await this.syncTemplates(user.tenantId).catch(() => null);
    return this.status(user);
  }

  async disconnect(user: AuthenticatedUser) {
    this.assertManager(user);
    await this.prisma.whatsappConfig.updateMany({ where: { tenantId: user.tenantId }, data: { isActive: false } });
    await this.prisma.metaConnection.updateMany({ where: { tenantId: user.tenantId }, data: { wabaId: null, waPhoneNumberId: null } });
    return { ok: true };
  }

  async saveSettings(user: AuthenticatedUser, b: { language?: string; sendConfirm?: boolean; confirmCodOnly?: boolean; sendDispatched?: boolean; sendDelivered?: boolean }) {
    this.assertManager(user);
    const cfg = await this.prisma.whatsappConfig.findUnique({ where: { tenantId: user.tenantId } });
    if (!cfg) throw new BadRequestException('Pehle WhatsApp number joren');
    const data: Prisma.WhatsappConfigUpdateInput = {};
    if (b?.language === 'en' || b?.language === 'ur') data.language = b.language;
    for (const k of ['sendConfirm', 'confirmCodOnly', 'sendDispatched', 'sendDelivered'] as const) if (typeof b?.[k] === 'boolean') data[k] = b[k];
    await this.prisma.whatsappConfig.update({ where: { tenantId: user.tenantId }, data });
    return this.status(user);
  }

  /* ───────────────────────── templates ───────────────────────── */

  private async shopTexts(tenantId: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: waTextsKey(tenantId) } });
    try { return normalizeWaTemplates(row?.value ? JSON.parse(row.value) : null); } catch { return {}; }
  }

  /**
   * Submits the shop's texts (or Nafaa's defaults) as templates for review.
   * A template already at Meta is edited instead.
   */
  async submitTemplates(user: AuthenticatedUser, b: { keys?: string[] }) {
    this.assertManager(user);
    await this.live(user.tenantId);
    const cfg = await this.active(user.tenantId);
    if (!cfg) throw new BadRequestException('Pehle WhatsApp number joren');
    const texts = await this.shopTexts(user.tenantId);
    const keys = (Array.isArray(b?.keys) && b.keys.length ? b.keys : [...WA_CLOUD_KEYS]).filter((k): k is WaCloudKey => (WA_CLOUD_KEYS as readonly string[]).includes(k));
    const results: Array<{ key: string; ok: boolean; status?: string; error?: string }> = [];
    for (const key of keys) {
      // The confirmation always asks for a button tap, so its text is Nafaa's own.
      const draft = templateDraft(key, key === 'confirm' ? null : (texts as any)[key === 'cart' ? 'cart' : key] ?? null, cfg.language);
      const payload = templateCreatePayload(draft);
      const slug = `${draft.name}_${draft.language}`;
      const existing = await this.prisma.whatsappTemplate.findUnique({ where: { tenantId_slug: { tenantId: user.tenantId, slug } } });
      try {
        let id = existing?.metaTemplateId ?? null;
        let status = 'PENDING';
        if (id) {
          await this.graph.call(user.tenantId, { method: 'POST', path: id, body: { components: payload.components } });
        } else {
          try {
            const res = await this.graph.call(user.tenantId, { method: 'POST', path: `${cfg.wabaId}/message_templates`, body: payload });
            id = String(res.id);
            status = String(res.status ?? 'PENDING').toUpperCase();
          } catch (e) {
            // Already made at Meta (earlier connect): find it by name and edit it.
            const found = await this.graph.call(user.tenantId, { path: `${cfg.wabaId}/message_templates`, params: { name: draft.name, fields: 'id,name,language,status' } }).catch(() => null);
            const hit = (found?.data ?? []).find((t: any) => t?.name === draft.name && t?.language === draft.language);
            if (!hit) throw e;
            id = String(hit.id);
            await this.graph.call(user.tenantId, { method: 'POST', path: id, body: { components: payload.components } });
          }
        }
        const data = {
          name: draft.name, language: draft.language, category: draft.category, bodyText: draft.body, variables: draft.params,
          buttons: key === 'confirm' ? ([...CONFIRM_BUTTONS] as Prisma.InputJsonValue) : Prisma.DbNull, templateKey: key, metaTemplateId: id,
          status, isApproved: status === 'APPROVED', approvedAt: status === 'APPROVED' ? new Date() : null, rejectedReason: null, syncedAt: new Date(),
        };
        await this.prisma.whatsappTemplate.upsert({ where: { tenantId_slug: { tenantId: user.tenantId, slug } }, create: { tenantId: user.tenantId, slug, ...data }, update: data });
        results.push({ key, ok: true, status });
      } catch (e: any) {
        results.push({ key, ok: false, error: String(e?.response?.message ?? e?.message ?? 'Nahi hua').slice(0, 300) });
      }
    }
    return { results, status: await this.status(user) };
  }

  /** Review states from Meta for the shop's Nafaa templates. */
  async syncTemplates(tenantId: string) {
    const cfg = await this.active(tenantId);
    if (!cfg) return { updated: 0 };
    const rows = await this.graph.callAll(tenantId, { path: `${cfg.wabaId}/message_templates`, params: { fields: 'id,name,language,status,category,rejected_reason', limit: 100 } }, 300);
    const names = new Set(Object.values(WA_TEMPLATE_NAME));
    let updated = 0;
    for (const t of rows as any[]) {
      if (!names.has(t?.name)) continue;
      const key = (Object.keys(WA_TEMPLATE_NAME) as WaCloudKey[]).find((k) => WA_TEMPLATE_NAME[k] === t.name)!;
      const slug = `${t.name}_${t.language}`;
      const status = String(t.status ?? 'PENDING').toUpperCase();
      const reason = t.rejected_reason && t.rejected_reason !== 'NONE' ? String(t.rejected_reason) : null;
      const existing = await this.prisma.whatsappTemplate.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
      const data = { metaTemplateId: String(t.id), status, rejectedReason: reason, isApproved: status === 'APPROVED', approvedAt: status === 'APPROVED' ? existing?.approvedAt ?? new Date() : null, syncedAt: new Date(), templateKey: key };
      if (existing) await this.prisma.whatsappTemplate.update({ where: { id: existing.id }, data });
      else await this.prisma.whatsappTemplate.create({ data: { tenantId, slug, name: t.name, language: t.language, category: String(t.category ?? WA_CATEGORY[key]), bodyText: WA_DEFAULT_TEXT[key], ...data } });
      updated++;
    }
    return { updated };
  }

  async syncNow(user: AuthenticatedUser) {
    await this.live(user.tenantId);
    await this.syncTemplates(user.tenantId);
    return this.status(user);
  }

  /** Hourly: templates still under review. */
  @Cron('0 50 * * * *')
  async syncPending() {
    if (process.env.DISABLE_META_ADS_SYNC === '1') return;
    const pending = await this.prisma.whatsappTemplate.findMany({ where: { templateKey: { not: null }, status: 'PENDING' }, distinct: ['tenantId'], select: { tenantId: true } });
    for (const { tenantId } of pending) {
      if (!(await metaAccess(this.prisma, tenantId)).live) continue;
      await this.syncTemplates(tenantId).catch((e) => this.logger.warn(`WA templates ${tenantId}: ${e?.message ?? e}`));
    }
  }

  /* ───────────────────────── sending ───────────────────────── */

  /**
   * Sends the template for an order event when the shop has it on, the
   * template is approved and it was not sent before. Never throws for a
   * normal skip; returns the reason instead.
   */
  async sendForOrder(tenantId: string, orderId: string, key: WaCloudKey): Promise<{ sent: boolean; reason?: string; messageId?: string }> {
    const cfg = await this.active(tenantId);
    if (!cfg) return { sent: false, reason: 'not_connected' };
    if ((key === 'confirm' && !cfg.sendConfirm) || (key === 'dispatched' && !cfg.sendDispatched) || (key === 'delivered' && !cfg.sendDelivered)) return { sent: false, reason: 'off' };
    if (!(await metaAccess(this.prisma, tenantId)).live) return { sent: false, reason: 'not_live' };
    const order = await this.prisma.channelOrder.findFirst({ where: { id: orderId, tenantId, deletedAt: null } });
    if (!order) return { sent: false, reason: 'no_order' };
    const meta = (order.metadata ?? {}) as any;
    if (meta.test || meta.imported) return { sent: false, reason: 'test' };
    if (key === 'confirm') {
      if (CLOSED.includes(order.orderStatus) || order.dispatchedAt || ['OUT_FOR_DELIVERY', 'DELIVERED', 'SETTLED'].includes(order.orderStatus)) return { sent: false, reason: 'not_pending' };
      if (meta.confirmation?.result === 'CONFIRMED') return { sent: false, reason: 'already_confirmed' };
      if (cfg.confirmCodOnly && !meta.cod) return { sent: false, reason: 'prepaid' };
    }
    const to = waNumber(order.customerPhone);
    if (!to) return { sent: false, reason: 'no_phone' };
    const before = await this.prisma.whatsappMessage.findFirst({ where: { tenantId, orderId, event: key, direction: 'OUT', status: { not: 'FAILED' } }, select: { id: true } });
    if (before) return { sent: false, reason: 'already_sent' };
    const tpl = await this.prisma.whatsappTemplate.findFirst({ where: { tenantId, templateKey: key, language: cfg.language, status: 'APPROVED' } });
    if (!tpl) return { sent: false, reason: 'template_not_approved' };

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const values = orderValues(order, tenant?.name ?? '', orderMoney(order).codDue);
    const params = (tpl.variables ?? []).map((p) => (values as any)[p] ?? '');
    const buttons = key === 'confirm' ? [confirmPayload(order.id, 'yes'), confirmPayload(order.id, 'no')] : [];
    const body = tpl.bodyText.replace(/\{\{(\d+)\}\}/g, (_m, n) => params[Number(n) - 1] ?? '');
    try {
      const res = await this.graph.call(tenantId, { method: 'POST', path: `${cfg.phoneNumberId}/messages`, body: templateSendPayload(to, { name: tpl.name, language: tpl.language }, params, buttons) });
      const messageId = String(res?.messages?.[0]?.id ?? '') || null;
      await this.prisma.whatsappMessage.create({ data: { tenantId, toPhone: to, waId: to, templateSlug: tpl.slug, body, status: 'SENT', metaMessageId: messageId, orderId, event: key, direction: 'OUT', customerName: order.customerName } });
      await this.prisma.whatsappConfig.update({ where: { tenantId }, data: { totalMessagesSent: { increment: 1 }, lastError: null } });
      await appendTimeline(this.prisma, orderId, { at: new Date().toISOString(), by: null, byName: 'WhatsApp', from: order.orderStatus, to: order.orderStatus, note: `WhatsApp: ${tpl.name}` }).catch(() => null);
      if (key === 'confirm') await this.tag(orderId);
      return { sent: true, messageId: messageId ?? undefined };
    } catch (e: any) {
      const msg = String(e?.response?.message ?? e?.message ?? 'Nahi gaya').slice(0, 300);
      await this.prisma.whatsappMessage.create({ data: { tenantId, toPhone: to, waId: to, templateSlug: tpl.slug, body, status: 'FAILED', errorMessage: msg, orderId, event: key, direction: 'OUT', customerName: order.customerName } });
      await this.prisma.whatsappConfig.update({ where: { tenantId }, data: { lastError: msg, lastErrorAt: new Date() } });
      return { sent: false, reason: msg };
    }
  }

  /** Adds the board's "Texted" tag. */
  private async tag(orderId: string) {
    await this.prisma.$executeRaw`
      UPDATE "channel_orders"
      SET "metadata" = jsonb_set(COALESCE("metadata", '{}'::jsonb), '{tags}',
        (CASE WHEN jsonb_typeof("metadata"->'tags') = 'array' THEN "metadata"->'tags' ELSE '[]'::jsonb END) || ${JSON.stringify([TEXTED_TAG])}::jsonb)
      WHERE "id" = ${orderId} AND NOT (COALESCE("metadata"->'tags', '[]'::jsonb) @> ${JSON.stringify([TEXTED_TAG])}::jsonb)`;
  }

  /** Sends one order message now (board button "WhatsApp bhejein"). */
  async sendNow(user: AuthenticatedUser, orderId: string, b: { key?: string }) {
    await this.live(user.tenantId);
    const key = (WA_CLOUD_KEYS as readonly string[]).includes(String(b?.key)) ? (b.key as WaCloudKey) : 'confirm';
    const order = await this.prisma.channelOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId, ...(user.shopId ? { OR: [{ shopId: user.shopId }, { shopId: null }] } : {}) }, select: { id: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    const res = await this.sendForOrder(user.tenantId, orderId, key);
    if (!res.sent) throw new BadRequestException(SKIP_TEXT[res.reason ?? ''] ?? res.reason ?? 'Message nahi gaya');
    return res;
  }

  /** Free text inside the customer's 24 hour window (inbox replies). */
  async sendText(tenantId: string, to: string, text: string, userId?: string | null) {
    const cfg = await this.active(tenantId);
    if (!cfg) throw new BadRequestException('WhatsApp number jura nahi');
    const num = waNumber(to);
    if (!num) throw new BadRequestException('Phone number sahi nahi');
    const res = await this.graph.call(tenantId, { method: 'POST', path: `${cfg.phoneNumberId}/messages`, body: textSendPayload(num, text) });
    const messageId = String(res?.messages?.[0]?.id ?? '') || null;
    await this.prisma.whatsappMessage.create({ data: { tenantId, toPhone: num, waId: num, body: text.slice(0, 4096), status: 'SENT', metaMessageId: messageId, event: 'reply', direction: 'OUT' } });
    void userId;
    return { messageId };
  }

  /** Meta's sample template to a test number (dev mode: only numbers added in the Meta app). */
  async test(user: AuthenticatedUser, b: { phone?: string }) {
    this.assertManager(user);
    await this.live(user.tenantId);
    const cfg = await this.active(user.tenantId);
    if (!cfg) throw new BadRequestException('Pehle WhatsApp number joren');
    const to = waNumber(b?.phone);
    if (!to) throw new BadRequestException('Phone number sahi nahi');
    const res = await this.graph.call(user.tenantId, { method: 'POST', path: `${cfg.phoneNumberId}/messages`, body: templateSendPayload(to, { name: 'hello_world', language: 'en_US' }, []) });
    const messageId = String(res?.messages?.[0]?.id ?? '') || null;
    await this.prisma.whatsappMessage.create({ data: { tenantId: user.tenantId, toPhone: to, waId: to, templateSlug: 'hello_world', body: 'hello_world', status: 'SENT', metaMessageId: messageId, event: 'test', direction: 'OUT' } });
    return { ok: true };
  }

  async messages(user: AuthenticatedUser, q: { direction?: string; orderId?: string; limit?: string }) {
    const take = Math.min(200, Math.max(10, Number(q.limit) || 50));
    const rows = await this.prisma.whatsappMessage.findMany({
      where: { tenantId: user.tenantId, ...(q.direction === 'IN' || q.direction === 'OUT' ? { direction: q.direction } : {}), ...(q.orderId ? { orderId: q.orderId } : {}) },
      orderBy: { createdAt: 'desc' }, take,
    });
    const ids = [...new Set(rows.map((r) => r.orderId).filter(Boolean))] as string[];
    const orders = ids.length ? await this.prisma.channelOrder.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, externalOrderNumber: true, externalOrderId: true } }) : [];
    const no = new Map(orders.map((o) => [o.id, String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '')]));
    return { items: rows.map((r) => ({ ...r, orderNo: r.orderId ? no.get(r.orderId) ?? null : null })) };
  }

  /* ───────────────────────── webhook ───────────────────────── */

  /** Handles a verified WhatsApp Business Account body (from the shared Meta webhook, signature already checked). */
  async handle(body: any) {
    const { inbound, statuses, templates } = parseWaWebhook(body);
    for (const s of statuses) {
      await this.prisma.whatsappMessage.updateMany({
        where: { metaMessageId: s.messageId },
        data: {
          status: s.status,
          ...(s.status === 'DELIVERED' && { deliveredAt: s.at }),
          ...(s.status === 'READ' && { readAt: s.at }),
          ...(s.category && { category: s.category }),
          ...(s.error && { errorMessage: s.error.slice(0, 300) }),
        },
      }).catch(() => null);
    }
    for (const t of templates) {
      const status = t.event.toUpperCase();
      await this.prisma.whatsappTemplate.updateMany({
        where: { metaTemplateId: t.templateId },
        data: { status, rejectedReason: t.reason, isApproved: status === 'APPROVED', ...(status === 'APPROVED' && { approvedAt: new Date() }), syncedAt: new Date() },
      }).catch(() => null);
    }
    for (const m of inbound) await this.inbound(m).catch((e) => this.logger.warn(`WA inbound ${m.messageId}: ${e?.message ?? e}`));
  }

  private async inbound(m: WaInbound) {
    const cfgs = await this.prisma.whatsappConfig.findMany({ where: { phoneNumberId: m.phoneNumberId, isActive: true }, select: { tenantId: true } });
    for (const { tenantId } of cfgs) {
      if (await this.prisma.whatsappMessage.findFirst({ where: { tenantId, metaMessageId: m.messageId }, select: { id: true } })) continue;
      const reply = replyResult(m);
      const ctx = m.contextId ? await this.prisma.whatsappMessage.findFirst({ where: { tenantId, metaMessageId: m.contextId }, select: { orderId: true } }) : null;
      let orderId = reply?.orderId ?? ctx?.orderId ?? null;
      let applied = false;
      if (reply) {
        const order = await this.prisma.channelOrder.findFirst({ where: { id: reply.orderId, tenantId }, select: { id: true, customerPhone: true, orderStatus: true } });
        // The reply must come from the order's own customer.
        if (order && waNumber(order.customerPhone) === m.from && !CLOSED.includes(order.orderStatus)) {
          const orders = await this.orders();
          const actor = await orders.systemActor(tenantId);
          await orders.setConfirmation(actor, new ShopScope(null, true), order.id, { result: reply.result, note: `WhatsApp: ${m.text ?? (reply.result === 'CONFIRMED' ? CONFIRM_BUTTONS[0] : CONFIRM_BUTTONS[1])}` });
          applied = true;
        } else {
          orderId = order?.id ?? null;
        }
      }
      await this.prisma.whatsappMessage.create({
        data: {
          tenantId, toPhone: m.from, waId: m.from, customerName: m.name, body: m.text ?? `[${m.type}]`, status: 'RECEIVED', metaMessageId: m.messageId,
          direction: 'IN', orderId, event: reply ? 'confirm' : 'reply', payload: m.payload, contextId: m.contextId,
        },
      });
      if (applied) {
        const thanks = reply!.result === 'CONFIRMED' ? 'Shukriya! Aap ka order confirm ho gaya. Jald bhej diya jayega.' : 'Theek hai, aap ka jawab mil gaya. Koi sawal ho to yahin likh dein.';
        await this.sendText(tenantId, m.from, thanks).catch(() => null);
      } else {
        await this.toInbox(tenantId, m, orderId).catch((e) => this.logger.warn(`WA inbox ${m.messageId}: ${e?.message ?? e}`));
      }
    }
  }

  /** Free text replies go to the Facebook & Instagram inbox as WhatsApp threads. */
  private async toInbox(tenantId: string, m: WaInbound, orderId: string | null) {
    const key = { tenantId, platform: 'WHATSAPP', accountId: m.phoneNumberId, participantId: m.from };
    const conv = await this.prisma.metaConversation.upsert({
      where: { tenantId_platform_accountId_participantId: key },
      create: { ...key, participantName: m.name, phone: m.from, lastText: m.text, lastMessageAt: m.at, lastInboundAt: m.at, unread: 1, channelOrderId: orderId },
      update: { participantName: m.name ?? undefined, lastText: m.text, lastMessageAt: m.at, lastInboundAt: m.at, unread: { increment: 1 }, status: 'OPEN', ...(orderId && { channelOrderId: orderId }) },
    });
    await this.prisma.metaMessage.upsert({
      where: { tenantId_externalId: { tenantId, externalId: m.messageId } },
      create: { tenantId, conversationId: conv.id, externalId: m.messageId, direction: 'IN', text: m.text ?? `[${m.type}]`, sentAt: m.at },
      update: {},
    });
  }
}

const SKIP_TEXT: Record<string, string> = {
  not_connected: apiText('WhatsApp number jura nahi'),
  off: apiText('Ye message settings me band hai'),
  not_live: apiText('WhatsApp Business abhi jald aa raha hai'),
  not_pending: apiText('Order naya nahi raha'),
  already_confirmed: apiText('Order pehle se confirm hai'),
  prepaid: apiText('Ye order pehle se paid hai'),
  no_phone: apiText('Order par sahi phone number nahi'),
  already_sent: apiText('Ye message pehle bhej chuke hain'),
  template_not_approved: apiText('Is message ka template abhi Meta se approve nahi hua'),
};
