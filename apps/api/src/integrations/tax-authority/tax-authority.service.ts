import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { decrypt, encrypt } from '../../core/lib/crypto';
import {
  AUTHORITIES, Authority, AuthorityCreds, Env, FBR_URL, FiscalBill, FiscalResult, KPRA_URL, PRA_URL, SRB_URL,
  kpraParse, kpraRequest, praParse, praRequest, srbParse, srbRequest, splitTax,
} from './adapters';

/* ═════════════════════════════════════════════════════════════
   Har bill authority ko: POS sale banne ke foran baad web /submit
   bulata hai (bill par fiscal number aa jaye). Jo reh jaye — offline
   bill, network ghalti, authority band — wo har 2 minute ka cron khud
   bhejta hai, backoff ke saath. Sale kabhi nahi rukti.
   ═════════════════════════════════════════════════════════════ */

export interface Terminal { shopId: string | null; posId: string; ntn: string; secret: string | null }
export interface TaxAuthorityConfig {
  authority: Authority;
  enabled: boolean;
  env: Env;
  businessName: string;
  /** PRA ke liye 8 harf ka PCT code (registration me milta hai); SRB cpcCode */
  pctCode: string;
  cashRate: number;
  /** Card / digital payment ka rate (PRA restaurant: 8%) */
  cardRate: number;
  /** Sirf POS ke bill (online orders nahi) */
  onlyPos: boolean;
  terminals: Terminal[];
  /** Is waqt se pehle ke bill nahi bheje jate */
  startAt: string | null;
}

const DEFAULT_RATES: Record<Authority, { cash: number; card: number }> = { PRA: { cash: 16, card: 8 }, SRB: { cash: 15, card: 8 }, KPRA: { cash: 15, card: 8 }, FBR: { cash: 18, card: 18 } };
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const key = (t: string) => `tax_authority:${t}`;
const BACKOFF_MIN = [2, 5, 15, 60, 180, 720, 1440];
const MASK = '••••';

@Injectable()
export class TaxAuthorityService {
  private readonly logger = new Logger(TaxAuthorityService.name);
  private running = false;
  private tableMissingLogged = false;

  constructor(private readonly prisma: PrismaService) {}

  private assert(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Tax settings sirf malik ya manager');
  }

  async read(tenantId: string): Promise<TaxAuthorityConfig | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: key(tenantId) } });
    try { return row?.value ? JSON.parse(row.value) : null; } catch { return null; }
  }

  private async write(tenantId: string, c: TaxAuthorityConfig) {
    const value = JSON.stringify(c);
    await this.prisma.systemSetting.upsert({
      where: { key: key(tenantId) },
      create: { key: key(tenantId), value, category: 'tax', isPublic: false },
      update: { value },
    });
  }

  private creds(t: Terminal): AuthorityCreds {
    let s: Partial<AuthorityCreds> = {};
    try { s = t.secret ? JSON.parse(decrypt(t.secret) ?? '{}') : {}; } catch { s = {}; }
    return { ...s, posId: t.posId, ntn: t.ntn };
  }

  private terminalFor(c: TaxAuthorityConfig, shopId: string | null) {
    return c.terminals.find((t) => t.shopId && t.shopId === shopId) ?? c.terminals.find((t) => !t.shopId) ?? null;
  }

  /* ───────────────────────── SETTINGS ───────────────────────── */

  /** POS ke liye bhi (cashier): sirf itna ke on hai ya nahi */
  async posStatus(tenantId: string) {
    const c = await this.read(tenantId);
    return { enabled: !!c?.enabled, authority: c?.authority ?? null, env: c?.env ?? null };
  }

  async overview(user: AuthenticatedUser) {
    this.assert(user);
    const c = await this.read(user.tenantId);
    const shops = await this.prisma.shop.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, name: true } });
    let stats: Record<string, number> = {};
    let recent: unknown[] = [];
    try {
      const g = await this.prisma.taxAuthorityInvoice.groupBy({ by: ['status'], where: { tenantId: user.tenantId }, _count: { _all: true } });
      stats = Object.fromEntries(g.map((x) => [x.status, x._count._all]));
      recent = await this.prisma.taxAuthorityInvoice.findMany({
        where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 30,
        select: { id: true, authority: true, kind: true, usin: true, status: true, fiscalNumber: true, totalAmount: true, taxAmount: true, error: true, attempts: true, createdAt: true, submittedAt: true },
      });
    } catch { /* migration abhi nahi chali */ }
    const safe = c && {
      ...c,
      terminals: c.terminals.map((t) => {
        const cr = this.creds(t);
        return { shopId: t.shopId, posId: t.posId, ntn: t.ntn, user: cr.user ?? '', hasSecret: !!(cr.token || cr.pass || cr.key) };
      }),
    };
    return { config: safe, authorities: AUTHORITIES, defaults: DEFAULT_RATES, shops, stats, recent };
  }

  async save(user: AuthenticatedUser, body: any) {
    this.assert(user);
    const cur = await this.read(user.tenantId);
    const authority: Authority = ['PRA', 'SRB', 'KPRA', 'FBR'].includes(body?.authority) ? body.authority : cur?.authority ?? 'PRA';
    const rates = DEFAULT_RATES[authority];
    const num = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 50 ? n : d; };
    const shopIds = new Set((await this.prisma.shop.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })).map((s) => s.id));

    const terminals: Terminal[] = [];
    for (const t of Array.isArray(body?.terminals) ? body.terminals.slice(0, 50) : cur?.terminals ?? []) {
      const shopId = t.shopId && shopIds.has(t.shopId) ? String(t.shopId) : null;
      const posId = String(t.posId ?? '').trim();
      const ntn = String(t.ntn ?? '').trim();
      if (!posId || !ntn) throw new BadRequestException('Har POS ke liye POS ID aur NTN zaroori');
      if (authority !== 'KPRA' && !/^\d{1,19}$/.test(posId)) throw new BadRequestException('POS ID sirf number');
      if (terminals.some((x) => x.shopId === shopId)) throw new BadRequestException('Ek branch ka ek hi POS');
      const old = cur?.terminals.find((x) => x.shopId === shopId);
      const prev = old ? this.creds(old) : ({} as AuthorityCreds);
      const pick = (k: 'token' | 'user' | 'pass' | 'key') => {
        const v = t[k] === undefined ? undefined : String(t[k]).trim();
        return v && !v.startsWith(MASK) ? v : prev[k];
      };
      const secret = { token: pick('token'), user: pick('user'), pass: pick('pass'), key: pick('key') };
      const need = authority === 'PRA' || authority === 'FBR' ? secret.token : authority === 'SRB' ? secret.user && secret.pass : secret.key;
      if (!need) throw new BadRequestException(authority === 'PRA' || authority === 'FBR' ? `${authority} token zaroori` : authority === 'SRB' ? 'SRB user aur password zaroori' : 'KPRA key zaroori');
      terminals.push({ shopId, posId, ntn, secret: encrypt(JSON.stringify(secret)) });
    }

    const enabled = body?.enabled === undefined ? !!cur?.enabled : !!body.enabled;
    if (enabled && !terminals.length) throw new BadRequestException('Pehle POS ID jorein');
    const pctCode = String(body?.pctCode ?? cur?.pctCode ?? '').trim();
    if (enabled && (authority === 'PRA' || authority === 'FBR') && !/^\d{4}\.?\d{4}$/.test(pctCode)) throw new BadRequestException(`${authority} ke liye 8 number ka PCT code (jaise 9801.2000) — registration me milta hai`);

    const next: TaxAuthorityConfig = {
      authority, enabled,
      env: body?.env === 'live' ? 'live' : body?.env === 'sandbox' ? 'sandbox' : cur?.env ?? 'sandbox',
      businessName: String(body?.businessName ?? cur?.businessName ?? '').trim().slice(0, 120),
      pctCode: pctCode.replace('.', ''),
      cashRate: num(body?.cashRate, cur?.authority === authority ? cur.cashRate : rates.cash),
      cardRate: num(body?.cardRate, cur?.authority === authority ? cur.cardRate : rates.card),
      onlyPos: body?.onlyPos === undefined ? cur?.onlyPos ?? true : !!body.onlyPos,
      terminals,
      // On karte waqt se aage ke bill (purane bill authority ko nahi jate)
      startAt: enabled ? (cur?.enabled && cur.startAt ? cur.startAt : new Date().toISOString()) : null,
    };
    await this.write(user.tenantId, next);
    return this.overview(user);
  }

  /* ───────────────────────── SUBMIT ───────────────────────── */

  private async post(url: string, body: unknown, headers: Record<string, string> = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 500) }; }
      return { status: res.status, body: json };
    } catch (e: any) {
      return { status: 0, body: { error: e?.name === 'AbortError' ? '12 second me jawab nahi aaya' : e?.message ?? 'Network error' } };
    } finally {
      clearTimeout(timer);
    }
  }

  async send(c: TaxAuthorityConfig, creds: AuthorityCreds, bill: FiscalBill): Promise<{ request: unknown; result: FiscalResult }> {
    if (c.authority === 'PRA' || c.authority === 'FBR') {
      // FBR POS aur PRA ka format ek hi (PRAL) — sirf URL alag
      const request = praRequest(bill, creds);
      const r = await this.post((c.authority === 'PRA' ? PRA_URL : FBR_URL)[c.env], request, { Authorization: `Bearer ${creds.token ?? ''}` });
      return { request: { ...request }, result: praParse(r.status, r.body, c.authority) };
    }
    if (c.authority === 'SRB') {
      const request = srbRequest(bill, creds, c.env);
      const r = await this.post(SRB_URL, request);
      return { request: { ...request, pos_pass: MASK }, result: srbParse(r.status, r.body) };
    }
    const request = kpraRequest(bill, creds);
    const r = await this.post(bill.kind === 'RETURN' ? KPRA_URL.credit : KPRA_URL.invoice, request);
    return { request: { ...request, key: MASK }, result: kpraParse(r.status, r.body, creds, bill.kind === 'RETURN' ? bill.refUsin ?? bill.usin : bill.usin) };
  }

  private rateFor(c: TaxAuthorityConfig, payment: string) {
    return payment === 'CASH' ? c.cashRate : c.cardRate;
  }

  /** Ek sale authority ko — dobara bulane par wahi jawab (dohra bill nahi) */
  async submitSale(tenantId: string, saleId: string) {
    const c = await this.read(tenantId);
    if (!c?.enabled) return { skipped: true, reason: 'Tax authority band hai' };
    const existing = await this.prisma.taxAuthorityInvoice.findUnique({ where: { authority_kind_saleId_returnId: { authority: c.authority, kind: 'SALE', saleId, returnId: '' } } });
    if (existing?.status === 'SUCCESS') return this.view(existing);

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: { include: { product: { select: { name: true, sku: true, barcode: true } } } }, customer: true },
    });
    if (!sale) throw new NotFoundException('Sale nahi mili');
    const term = this.terminalFor(c, sale.shopId);
    if (!term) return { skipped: true, reason: 'Is branch ka POS ID nahi' };
    if (sale.status === 'VOIDED') return { skipped: true, reason: 'Void bill' };

    const rate = this.rateFor(c, String(sale.paymentMethod));
    const bill: FiscalBill = {
      usin: sale.saleNumber, kind: 'SALE', at: sale.soldAt, total: Number(sale.total), rate, payment: String(sale.paymentMethod),
      buyer: { name: sale.customer?.name, phone: sale.customer?.phone, ntn: sale.customer?.ntn, cnic: sale.customer?.cnic, email: sale.customer?.email, address: sale.customer?.address },
      lines: sale.items.map((i) => ({ code: i.product?.sku || i.product?.barcode || i.productId || 'ITEM', name: i.product?.name ?? 'Item', qty: i.quantity, total: Number(i.total) })),
      pctCode: c.pctCode, businessName: c.businessName,
    };
    return this.record(tenantId, c, term, bill, { saleId, returnId: '', shopId: sale.shopId, existing });
  }

  private async submitReturn(tenantId: string, c: TaxAuthorityConfig, returnId: string) {
    const ret = await this.prisma.saleReturn.findFirst({ where: { id: returnId, tenantId } });
    if (!ret) return;
    const sale = await this.prisma.sale.findFirst({ where: { id: ret.saleId, tenantId }, select: { id: true, saleNumber: true, shopId: true, paymentMethod: true } });
    if (!sale) return;
    // Asal bill authority tak gaya ho tabhi uska return
    const orig = await this.prisma.taxAuthorityInvoice.findUnique({ where: { authority_kind_saleId_returnId: { authority: c.authority, kind: 'SALE', saleId: sale.id, returnId: '' } } });
    if (orig?.status !== 'SUCCESS') return;
    const existing = await this.prisma.taxAuthorityInvoice.findUnique({ where: { authority_kind_saleId_returnId: { authority: c.authority, kind: 'RETURN', saleId: sale.id, returnId } } });
    if (existing?.status === 'SUCCESS') return;
    const term = this.terminalFor(c, sale.shopId);
    if (!term) return;
    const bill: FiscalBill = {
      usin: ret.returnNumber, refUsin: sale.saleNumber, kind: 'RETURN', at: ret.returnedAt, total: Number(ret.refundAmount),
      rate: orig.taxRate || this.rateFor(c, String(sale.paymentMethod)), payment: String(ret.refundMethod), buyer: {},
      lines: [{ code: 'RETURN', name: `Return ${sale.saleNumber}`, qty: 1, total: Number(ret.refundAmount) }],
      pctCode: c.pctCode, businessName: c.businessName, reason: ret.reason ?? undefined,
    };
    await this.record(tenantId, c, term, bill, { saleId: sale.id, returnId, shopId: sale.shopId, existing });
  }

  private async record(tenantId: string, c: TaxAuthorityConfig, term: Terminal, bill: FiscalBill,
    o: { saleId: string; returnId: string; shopId: string | null; existing: { id: string; attempts: number } | null }) {
    const t = splitTax(bill.total, bill.rate);
    const base = {
      tenantId, shopId: o.shopId, authority: c.authority, kind: bill.kind, saleId: o.saleId, returnId: o.returnId,
      usin: bill.usin, posId: term.posId, saleValue: t.value, taxAmount: t.tax, totalAmount: bill.total, taxRate: bill.rate,
    };
    const row = o.existing
      ? await this.prisma.taxAuthorityInvoice.update({ where: { id: o.existing.id }, data: { ...base, status: 'PENDING' } })
      : await this.prisma.taxAuthorityInvoice.create({ data: { ...base, status: 'PENDING' } });

    const { request, result } = await this.send(c, this.creds(term), bill);
    const attempts = row.attempts + 1;
    const updated = await this.prisma.taxAuthorityInvoice.update({
      where: { id: row.id },
      data: {
        request: request as any, response: (result.response ?? null) as any, attempts, submittedAt: new Date(),
        status: result.ok ? 'SUCCESS' : 'FAILED',
        fiscalNumber: result.fiscalNumber ?? null, qrText: result.qrText ?? null, error: result.ok ? null : result.error ?? 'Ghalti',
        // Network / server ghalti: dobara. Data ki ghalti: bhi dobara (settings theek ho sakti hain) lekin der se
        nextAttemptAt: result.ok ? null : new Date(Date.now() + (BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)] * (result.retry ? 1 : 3)) * 60_000),
      },
    });
    if (!result.ok) this.logger.warn(`${c.authority} ${bill.usin}: ${result.error}`);
    return this.view(updated);
  }

  private view(r: { authority: string; status: string; fiscalNumber: string | null; qrText: string | null; error: string | null; usin: string; taxAmount: number; taxRate: number }) {
    return {
      authority: r.authority, status: r.status, fiscalNumber: r.fiscalNumber, qrText: r.qrText, error: r.error,
      usin: r.usin, taxAmount: r.taxAmount, taxRate: r.taxRate,
      label: r.authority === 'FBR' ? 'FBR Invoice No' : r.authority === 'PRA' ? 'PRA Fiscal Invoice No' : r.authority === 'SRB' ? 'SRB Invoice No' : 'KPRA Invoice No',
    };
  }

  /** Har receipt page bulata hai — kabhi error nahi (tax band / migration baqi = null) */
  async saleStatus(tenantId: string, saleId: string) {
    try {
      const r = await this.prisma.taxAuthorityInvoice.findFirst({ where: { tenantId, saleId, kind: 'SALE' }, orderBy: { createdAt: 'desc' } });
      return r ? this.view(r) : null;
    } catch {
      return null;
    }
  }

  /** Sandbox me namoona bill (live me nahi — asli tax invoice ban jati) */
  async test(user: AuthenticatedUser) {
    this.assert(user);
    const c = await this.read(user.tenantId);
    if (!c?.terminals.length) throw new BadRequestException('Pehle POS ID aur keys save karein');
    if (c.env === 'live') throw new BadRequestException('Test sirf Sandbox me — live me asli tax bill ban jata hai');
    const term = c.terminals[0];
    const bill: FiscalBill = {
      usin: `NAFAA-TEST-${Date.now()}`, kind: 'SALE', at: new Date(), total: 116, rate: c.cashRate, payment: 'CASH', buyer: {},
      lines: [{ code: 'TEST', name: 'Nafaa test item', qty: 1, total: 116 }], pctCode: c.pctCode, businessName: c.businessName || 'Nafaa test',
    };
    const { result } = await this.send(c, this.creds(term), bill);
    return { ok: result.ok, fiscalNumber: result.fiscalNumber ?? null, error: result.error ?? null, response: result.response ?? null };
  }

  /* ─────────────────────────── CRON ─────────────────────────── */

  @Cron('0 */2 * * * *')
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: 'tax_authority:' } }, select: { key: true, value: true } });
      for (const r of rows) {
        let c: TaxAuthorityConfig;
        try { c = JSON.parse(r.value); } catch { continue; }
        if (!c.enabled || !c.startAt) continue;
        const tenantId = r.key.slice('tax_authority:'.length);
        await this.sweepTenant(tenantId, c).catch((e) => {
          if (e?.code === 'P2021') {
            if (!this.tableMissingLogged) this.logger.warn('tax_authority_invoices table nahi — migration chalayein');
            this.tableMissingLogged = true;
          } else this.logger.warn(`tax sweep ${tenantId}: ${e?.message ?? e}`);
        });
      }
    } finally {
      this.running = false;
    }
  }

  private async sweepTenant(tenantId: string, c: TaxAuthorityConfig) {
    const now = new Date();
    // 1) Fail wale dobara
    const due = await this.prisma.taxAuthorityInvoice.findMany({
      where: { tenantId, authority: c.authority, status: { in: ['FAILED', 'PENDING'] }, attempts: { lt: 12 }, OR: [{ nextAttemptAt: { lte: now } }, { nextAttemptAt: null, updatedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }] },
      take: 30, orderBy: { createdAt: 'asc' },
    });
    for (const d of due) {
      if (d.kind === 'SALE') await this.submitSale(tenantId, d.saleId).catch(() => null);
      else await this.submitReturn(tenantId, c, d.returnId).catch(() => null);
    }

    // 2) Jo abhi tak gaye hi nahi (offline bill, web ne na bheja) — pichle 3 din
    const since = new Date(Math.max(Date.parse(c.startAt!), now.getTime() - 3 * 86_400_000));
    const shopFilter = c.terminals.some((t) => !t.shopId) ? {} : { shopId: { in: c.terminals.map((t) => t.shopId!).filter(Boolean) } };
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, createdAt: { gte: since, lt: new Date(now.getTime() - 60_000) }, status: { not: 'VOIDED' }, ...(c.onlyPos && { source: 'POS' }), ...shopFilter },
      select: { id: true }, orderBy: { createdAt: 'asc' }, take: 300,
    });
    if (sales.length) {
      const done = new Set((await this.prisma.taxAuthorityInvoice.findMany({
        where: { tenantId, authority: c.authority, kind: 'SALE', saleId: { in: sales.map((s) => s.id) } }, select: { saleId: true },
      })).map((x) => x.saleId));
      for (const s of sales.filter((x) => !done.has(x.id)).slice(0, 50)) await this.submitSale(tenantId, s.id).catch(() => null);
    }

    // 3) Returns
    const rets = await this.prisma.saleReturn.findMany({ where: { tenantId, returnedAt: { gte: since } }, select: { id: true }, take: 100 });
    if (rets.length) {
      const done = new Set((await this.prisma.taxAuthorityInvoice.findMany({
        where: { tenantId, authority: c.authority, kind: 'RETURN', returnId: { in: rets.map((r) => r.id) } }, select: { returnId: true },
      })).map((x) => x.returnId));
      for (const r of rets.filter((x) => !done.has(x.id)).slice(0, 20)) await this.submitReturn(tenantId, c, r.id).catch(() => null);
    }
  }
}
