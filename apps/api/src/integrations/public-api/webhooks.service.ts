import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { promises as dns } from 'dns';
import { isIP } from 'net';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { dateKeyTz } from '../../common/helpers/business-time.helper';
import { assertSafeWebhookUrl, isPrivateIp } from '../online-orders/website-config';
import { EVENT_TYPES, WebhookEvent, WebhookEventType, serialize } from './events';
import { K, readJson, writeJson } from './store';

/* ═════════════════════════════════════════════════════════════
   WEBHOOKS — Nafaa me kuch hua (sale, naya customer, order deliver,
   stock kam) → aap ke server / Zapier / Make ko turant khabar.

   Waqiat har minute DB se parhe jate hain (outbox ki tarah), is liye
   POS, offline sync, online order — kisi bhi raste se aayi sale chhoot-
   ti nahi. Har waqie ki pakki `id` hai; receiver dobara aane par chhor
   de. Fail ho to 1m → 5m → 30m → 2h → 6h → 12h baad dobara.
   ═════════════════════════════════════════════════════════════ */

export interface Endpoint {
  id: string;
  url: string;
  /** '*' = sab */
  events: string[];
  description: string;
  secret: string; // encrypted
  active: boolean;
  source: 'dashboard' | 'api';
  keyId?: string | null;
  shopId?: string | null;
  createdAt: string;
  failCount: number;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastError?: string | null;
  disabledReason?: string | null;
}

interface Cursor { at: string; seen: Record<string, number>; /** page bhar gaya tha — agli dafa overlap ke baghair */ exact?: boolean }
interface Retry { endpointId: string; event: WebhookEvent; attempts: number; nextAt: number }
export interface LogEntry { at: string; endpointId: string; eventId: string; type: string; ok: boolean; status?: number; ms: number; error?: string; attempt: number }

const BACKOFF_MIN = [1, 5, 30, 120, 360, 720];
const MAX_ENDPOINTS = 10;
const DISABLE_AFTER = 50;
const OVERLAP_MS = 60_000;
const PAGE = 200;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  /* ─────────────────────────── CRUD ─────────────────────────── */

  private async endpoints(tenantId: string) {
    return (await readJson<Endpoint[]>(this.prisma, K.hooks(tenantId))) ?? [];
  }
  private save(tenantId: string, list: Endpoint[]) {
    return writeJson(this.prisma, K.hooks(tenantId), list);
  }
  private view = ({ secret: _s, ...e }: Endpoint) => e;

  async overview(tenantId: string) {
    const [list, log, retry] = await Promise.all([
      this.endpoints(tenantId),
      readJson<LogEntry[]>(this.prisma, K.log(tenantId)),
      readJson<Retry[]>(this.prisma, K.retry(tenantId)),
    ]);
    return {
      endpoints: list.map(this.view),
      log: (log ?? []).slice(0, 50),
      pendingRetries: (retry ?? []).length,
    };
  }

  private cleanEvents(events: unknown): string[] {
    const arr = Array.isArray(events) ? events.map(String) : [];
    if (!arr.length || arr.includes('*')) return ['*'];
    const bad = arr.filter((e) => !EVENT_TYPES.includes(e));
    if (bad.length) throw new BadRequestException(`Ye event nahi hote: ${bad.join(', ')}`);
    return [...new Set(arr)];
  }

  private cleanUrl(url: unknown) {
    try { return assertSafeWebhookUrl(String(url ?? '')); } catch (e) { throw new BadRequestException((e as Error).message); }
  }

  async create(tenantId: string, body: { url?: string; events?: string[]; description?: string }, source: Endpoint['source'] = 'dashboard', key?: { keyId: string; shopId: string | null }) {
    const list = await this.endpoints(tenantId);
    if (list.length >= MAX_ENDPOINTS) throw new BadRequestException(`Zyada se zyada ${MAX_ENDPOINTS} webhooks`);
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;
    const ep: Endpoint = {
      id: `wh_${crypto.randomBytes(8).toString('hex')}`,
      url: this.cleanUrl(body.url),
      events: this.cleanEvents(body.events),
      description: String(body.description ?? '').trim().slice(0, 80) || (source === 'api' ? 'Zapier / Make' : ''),
      secret: encrypt(secret)!,
      active: true,
      source,
      keyId: key?.keyId ?? null,
      shopId: key?.shopId ?? null,
      createdAt: new Date().toISOString(),
      failCount: 0,
    };
    await this.save(tenantId, [...list, ep]);
    await this.ensureCursor(tenantId);
    return { ...this.view(ep), secret };
  }

  async update(tenantId: string, id: string, body: { url?: string; events?: string[]; description?: string; active?: boolean }) {
    const list = await this.endpoints(tenantId);
    const ep = list.find((e) => e.id === id);
    if (!ep) throw new NotFoundException('Webhook nahi mila');
    if (body.url !== undefined) ep.url = this.cleanUrl(body.url);
    if (body.events !== undefined) ep.events = this.cleanEvents(body.events);
    if (body.description !== undefined) ep.description = String(body.description).trim().slice(0, 80);
    if (body.active !== undefined) {
      ep.active = !!body.active;
      if (ep.active) { ep.failCount = 0; ep.disabledReason = null; }
    }
    await this.save(tenantId, list);
    return this.view(ep);
  }

  async remove(tenantId: string, id: string, keyId?: string) {
    const list = await this.endpoints(tenantId);
    const ep = list.find((e) => e.id === id && (!keyId || e.keyId === keyId));
    if (!ep) throw new NotFoundException('Webhook nahi mila');
    await this.save(tenantId, list.filter((e) => e !== ep));
    return { ok: true };
  }

  async rotateSecret(tenantId: string, id: string) {
    const list = await this.endpoints(tenantId);
    const ep = list.find((e) => e.id === id);
    if (!ep) throw new NotFoundException('Webhook nahi mila');
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;
    ep.secret = encrypt(secret)!;
    await this.save(tenantId, list);
    return { secret };
  }

  /** "Test bhejein" — ek namoona waqia foran */
  async test(tenantId: string, id: string) {
    const ep = (await this.endpoints(tenantId)).find((e) => e.id === id);
    if (!ep) throw new NotFoundException('Webhook nahi mila');
    const event: WebhookEvent = {
      id: `evt_test_${crypto.randomBytes(6).toString('hex')}`,
      type: 'sale.created',
      createdAt: new Date().toISOString(),
      data: { test: true, message: 'Nafaa se test webhook — sab theek hai' },
    };
    const r = await this.deliver(ep, event);
    await this.appendLog(tenantId, [{ at: new Date().toISOString(), endpointId: ep.id, eventId: event.id, type: 'test', ok: r.ok, status: r.status, ms: r.ms, error: r.error, attempt: 1 }]);
    return r;
  }

  /* ──────────────────────── DELIVERY ──────────────────────── */

  async deliver(ep: Endpoint, event: WebhookEvent): Promise<{ ok: boolean; status?: number; ms: number; error?: string }> {
    const t0 = Date.now();
    const body = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000);
    const secret = decrypt(ep.secret) ?? '';
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

    if (process.env.NODE_ENV === 'production') {
      const host = new URL(ep.url).hostname;
      const addrs = isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
      if (!addrs.length) return { ok: false, ms: Date.now() - t0, error: 'Address nahi mila (DNS)' };
      if (addrs.some((a) => isPrivateIp(a.address))) return { ok: false, ms: Date.now() - t0, error: 'Andar ka (private) address allowed nahi' };
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nafaa-Webhooks/1.0',
          'X-Nafaa-Event': event.type,
          'X-Nafaa-Delivery': event.id,
          'X-Nafaa-Timestamp': String(ts),
          'X-Nafaa-Signature': `t=${ts},v1=${sig}`,
        },
        body,
        signal: ctrl.signal,
        redirect: 'manual',
      });
      // Zapier / Make: 410 = "subscription khatam" → khud hata do
      if (res.status === 410) return { ok: false, status: 410, ms: Date.now() - t0, error: 'gone' };
      return res.ok ? { ok: true, status: res.status, ms: Date.now() - t0 } : { ok: false, status: res.status, ms: Date.now() - t0, error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, ms: Date.now() - t0, error: e?.name === 'AbortError' ? '10 second me jawab nahi aaya' : e?.message ?? 'Network error' };
    } finally {
      clearTimeout(timer);
    }
  }

  private async appendLog(tenantId: string, entries: LogEntry[]) {
    if (!entries.length) return;
    const log = (await readJson<LogEntry[]>(this.prisma, K.log(tenantId))) ?? [];
    await writeJson(this.prisma, K.log(tenantId), [...entries.reverse(), ...log].slice(0, 100));
  }

  /* ──────────────────────── COLLECTION ─────────────────────── */

  private async ensureCursor(tenantId: string) {
    const c = await readJson<Cursor>(this.prisma, K.cursor(tenantId));
    // Pehli dafa: sirf abhi ke baad wale waqiat (purana sab nahi bhejte)
    if (!c) await writeJson(this.prisma, K.cursor(tenantId), { at: new Date().toISOString(), seen: {} } satisfies Cursor);
  }

  /** since–until ke waqiat. `next` = agla cursor (page bhar gaya to wahin se) */
  async collect(tenantId: string, since: Date, until: Date): Promise<{ events: WebhookEvent[]; next: Date }> {
    const events: WebhookEvent[] = [];
    let next = until;
    const win = { gt: since, lte: until };
    const clip = (rows: { t: Date }[]) => { if (rows.length >= PAGE) { const last = rows[rows.length - 1].t; if (last < next) next = last; } };

    const sales = await this.prisma.sale.findMany({
      where: { tenantId, createdAt: win },
      include: { items: { include: { product: { select: { name: true, sku: true, barcode: true } } } }, customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: 'asc' }, take: PAGE,
    });
    clip(sales.map((s) => ({ t: s.createdAt })));
    for (const s of sales) events.push({ id: `sale.created:${s.id}`, type: 'sale.created', createdAt: s.createdAt.toISOString(), data: serialize.sale(s) });

    const customers = await this.prisma.customer.findMany({ where: { tenantId, createdAt: win }, orderBy: { createdAt: 'asc' }, take: PAGE });
    clip(customers.map((c) => ({ t: c.createdAt })));
    for (const c of customers) events.push({ id: `customer.created:${c.id}`, type: 'customer.created', createdAt: c.createdAt.toISOString(), data: serialize.customer(c) });

    const stamps: Array<[keyof typeof ORDER_STAMP, WebhookEventType]> = [
      ['receivedAt', 'online_order.created'], ['acceptedAt', 'online_order.accepted'], ['dispatchedAt', 'online_order.dispatched'],
      ['deliveredAt', 'online_order.delivered'], ['cancelledAt', 'online_order.cancelled'], ['returnedAt', 'online_order.returned'],
    ];
    const orders = await this.prisma.channelOrder.findMany({
      where: { tenantId, OR: stamps.map(([f]) => ({ [f]: win })) },
      include: { integration: { select: { displayName: true, type: true } } },
      take: PAGE * 2,
    });
    for (const o of orders) {
      if ((o.metadata as any)?.test) continue;
      for (const [f, type] of stamps) {
        const at = (o as any)[f] as Date | null;
        if (at && at > since && at <= until) events.push({ id: `${type}:${o.id}`, type, createdAt: at.toISOString(), data: serialize.order(o) });
      }
    }

    const low = await this.prisma.shopStock.findMany({
      where: { tenantId, updatedAt: win, isActive: true, lowStockAlert: { gt: 0 }, stock: { lte: this.prisma.shopStock.fields.lowStockAlert } },
      include: { product: { select: { name: true, sku: true, barcode: true, unit: true } }, shop: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' }, take: PAGE,
    });
    clip(low.map((s) => ({ t: s.updatedAt })));
    for (const s of low) {
      // Ek cheez ka "stock kam" din me ek hi dafa
      events.push({
        id: `stock.low:${s.id}:${dateKeyTz(s.updatedAt)}`, type: 'stock.low', createdAt: s.updatedAt.toISOString(),
        data: {
          productId: s.productId, variantId: s.variantId, name: s.product.name, sku: s.product.sku, barcode: s.product.barcode, unit: s.product.unit,
          shopId: s.shopId, shopName: s.shop.name, stock: s.stock, lowStockAlert: s.lowStockAlert,
        },
      });
    }

    events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { events: events.filter((e) => new Date(e.createdAt) <= next), next };
  }

  /** Zapier "sample data" — har event ki aakhri asli misaal */
  async sample(tenantId: string, type: string) {
    if (!EVENT_TYPES.includes(type)) throw new BadRequestException('Event type ghalat hai');
    const { events } = await this.collect(tenantId, new Date(Date.now() - 30 * 86_400_000), new Date());
    return events.filter((e) => e.type === type).slice(-3).reverse();
  }

  /* ─────────────────────────── TICK ─────────────────────────── */

  @Cron('0 * * * * *')
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: 'webhooks:' } }, select: { key: true, value: true } });
      for (const r of rows) {
        const tenantId = r.key.slice('webhooks:'.length);
        let list: Endpoint[] = [];
        try { list = JSON.parse(r.value); } catch { continue; }
        if (!list.some((e) => e.active)) continue;
        await this.runTenant(tenantId, list).catch((e) => this.logger.warn(`webhooks ${tenantId}: ${e?.message ?? e}`));
      }
    } finally {
      this.running = false;
    }
  }

  private matches(ep: Endpoint, e: WebhookEvent) {
    if (!ep.active) return false;
    if (!ep.events.includes('*') && !ep.events.includes(e.type)) return false;
    if (ep.shopId) {
      const shop = (e.data as any).shopId;
      if (shop && shop !== ep.shopId) return false;
    }
    return true;
  }

  private async runTenant(tenantId: string, list: Endpoint[]) {
    const now = Date.now();
    const cursor = (await readJson<Cursor>(this.prisma, K.cursor(tenantId))) ?? { at: new Date(now).toISOString(), seen: {} };
    const since = new Date(Date.parse(cursor.at) - (cursor.exact ? 1 : OVERLAP_MS));
    const until = new Date(now - 2_000);
    const { events, next } = await this.collect(tenantId, since, until);
    const fresh = events.filter((e) => !cursor.seen[e.id]);

    const retries = (await readJson<Retry[]>(this.prisma, K.retry(tenantId))) ?? [];
    const due = retries.filter((r) => r.nextAt <= now);
    const later = retries.filter((r) => r.nextAt > now);

    const jobs = new Map<string, Array<{ event: WebhookEvent; attempts: number }>>();
    for (const ep of list) jobs.set(ep.id, []);
    for (const e of fresh) for (const ep of list) if (this.matches(ep, e)) jobs.get(ep.id)!.push({ event: e, attempts: 0 });
    for (const r of due) jobs.get(r.endpointId)?.unshift({ event: r.event, attempts: r.attempts });

    const logs: LogEntry[] = [];
    const newRetries: Retry[] = [...later.filter((r) => list.some((e) => e.id === r.endpointId && e.active))];
    const gone = new Set<string>();

    await Promise.all(list.map(async (ep) => {
      const q = jobs.get(ep.id) ?? [];
      let broken = false;
      for (const job of q) {
        const attempt = job.attempts + 1;
        // Ek fail hua to is dafa baqi seedha qatar me — band server ko baar baar na maaro
        const r = broken ? { ok: false, ms: 0, error: 'pichla fail — qatar me' as string, status: undefined as number | undefined } : await this.deliver(ep, job.event);
        if (!broken) logs.push({ at: new Date().toISOString(), endpointId: ep.id, eventId: job.event.id, type: job.event.type, ok: r.ok, status: r.status, ms: r.ms, error: r.error, attempt });
        if (r.ok) { ep.failCount = 0; ep.lastSuccessAt = new Date().toISOString(); continue; }
        if (r.status === 410 && ep.source === 'api') { gone.add(ep.id); break; }
        broken = true;
        ep.failCount += 1;
        ep.lastFailureAt = new Date().toISOString();
        ep.lastError = r.error ?? null;
        if (attempt <= BACKOFF_MIN.length) {
          newRetries.push({ endpointId: ep.id, event: job.event, attempts: attempt, nextAt: now + BACKOFF_MIN[attempt - 1] * 60_000 });
        }
      }
      if (ep.failCount >= DISABLE_AFTER && ep.active) {
        ep.active = false;
        ep.disabledReason = `${DISABLE_AFTER} dafa lagatar fail — URL check karke dobara on karein`;
      }
    }));

    // Cursor aage — seen sirf 10 minute ka (overlap se zyada)
    const seen: Record<string, number> = {};
    for (const [k, t] of Object.entries(cursor.seen)) if (now - t < 10 * 60_000) seen[k] = t;
    for (const e of fresh) seen[e.id] = now;
    await writeJson(this.prisma, K.cursor(tenantId), { at: next.toISOString(), seen, exact: next < until } satisfies Cursor);
    await writeJson(this.prisma, K.retry(tenantId), newRetries.slice(-500));

    // Endpoint ki haalat (fail count, band) — list dobara parh kar sirf ye khane badlo
    if (logs.length || gone.size) {
      const latest = await this.endpoints(tenantId);
      const byId = new Map(list.map((e) => [e.id, e]));
      await this.save(tenantId, latest.filter((e) => !gone.has(e.id)).map((e) => {
        const u = byId.get(e.id);
        return u ? { ...e, failCount: u.failCount, lastSuccessAt: u.lastSuccessAt, lastFailureAt: u.lastFailureAt, lastError: u.lastError, active: e.active && u.active, disabledReason: u.disabledReason ?? e.disabledReason } : e;
      }));
      await this.appendLog(tenantId, logs);
    }
  }
}

const ORDER_STAMP = { receivedAt: 1, acceptedAt: 1, dispatchedAt: 1, deliveredAt: 1, cancelledAt: 1, returnedAt: 1 };
