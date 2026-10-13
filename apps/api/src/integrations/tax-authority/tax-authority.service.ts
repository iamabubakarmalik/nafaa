import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, type TaxAuthorityInvoice } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { businessDayKey, startOfBusinessMonthTz } from '../../common/helpers/business-time.helper';
import { BusinessClock, TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../common/shop-scope/shop-scope.types';
import { periodRange } from '../../modules/inventory/taxonomy/taxonomy.helper';
import { InvRow, byAuthority, daysBetween, health, monthDays, monthlyReport, notSent, reportCsv } from './tax-reports';
import {
  AUTHORITIES, Authority, AuthorityCreds, FBR_URL, FiscalBill, FiscalResult, KPRA_URL, PRA_URL, SRB_URL,
  kpraParse, kpraRequest, praParse, praRequest, srbParse, srbRequest, splitTax,
} from './adapters';
import {
  RoutingConflict, TaxAuthorityConfig, Terminal, isAuthority, maskSecrets, readSetup, routeFor, routingConflict, salesShopWhere, terminalIn, writeSetup,
} from './tax-setup';

/* ═════════════════════════════════════════════════════════════
   Every bill to its tax authority. Right after a POS sale the web calls
   /submit so the fiscal number lands on the printed bill. Whatever is
   left (offline bills, network errors, authority down) the 2-minute cron
   sends with backoff. A sale is never blocked.

   Sending is claimed first: a new row is created (unique key) or an
   existing one is moved to PENDING only if nobody changed it since it was
   read. Two callers can never send the same bill at the same time.
   ═════════════════════════════════════════════════════════════ */

export interface TaxQuery {
  from?: string; to?: string; month?: string; authority?: string; status?: string; kind?: string;
  shopId?: string; search?: string; page?: string; limit?: string;
}

const DEFAULT_RATES: Record<Authority, { cash: number; card: number }> = { PRA: { cash: 16, card: 8 }, SRB: { cash: 15, card: 8 }, KPRA: { cash: 15, card: 8 }, FBR: { cash: 18, card: 18 } };
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const OWNERS = ['OWNER', 'SUPER_ADMIN'];
const STATUSES = ['SUCCESS', 'FAILED', 'PENDING', 'SKIPPED'];
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const settingKey = (t: string) => `tax_authority:${t}`;
const BACKOFF_MIN = [2, 5, 15, 60, 180, 720, 1440];
/** A PENDING row touched this recently is being sent right now. */
const IN_FLIGHT_MS = 30_000;
const DAY_MS = 86_400_000;
const MASK = '••••';
const STALE = 'Tax settings abhi kisi aur ne badli hain. Safha taaza karke dobara save karein.';
const missingTable = (e: any) => e?.code === 'P2021';

function chunks<T>(list: T[], size = 5000): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

type Skipped = { skipped: true; reason: string };
const skip = (reason: string): Skipped => ({ skipped: true, reason });

@Injectable()
export class TaxAuthorityService {
  private readonly logger = new Logger(TaxAuthorityService.name);
  private running = false;
  private tableMissingLogged = false;
  /** Tenants with a "retry all failed" run in progress. */
  private readonly bulk = new Set<string>();

  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  private assert(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Tax ka hisaab sirf malik ya manager dekh sakte hain');
  }

  /** Branch a read is limited to: staff stay in their own branch; owners may pick one. */
  private branch(user: AuthenticatedUser, scope: ShopScope, requested?: string): string | undefined {
    if (!OWNERS.includes(String(user.role))) return scope.shopId ?? undefined;
    const r = requested?.trim();
    return r && r !== 'all' ? r : scope.shopId ?? undefined;
  }

  /** Row filter for single-record actions: only staff are held to their branch. */
  private staffLock(user: AuthenticatedUser, scope: ShopScope): { shopId?: string } {
    return !OWNERS.includes(String(user.role)) && scope.shopId ? { shopId: scope.shopId } : {};
  }

  async read(tenantId: string): Promise<TaxAuthorityConfig[]> {
    return (await this.load(tenantId)).profiles;
  }

  private async load(tenantId: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: settingKey(tenantId) }, select: { value: true } });
    return { raw: row?.value ?? null, profiles: readSetup(row?.value) };
  }

  /** Writes only if the record is still what was read, so two saves never overwrite each other. */
  private async store(tenantId: string, prevRaw: string | null, profiles: TaxAuthorityConfig[]) {
    const value = writeSetup(profiles);
    if (prevRaw === null) {
      try {
        await this.prisma.systemSetting.create({ data: { key: settingKey(tenantId), value, category: 'tax', isPublic: false } });
      } catch (e: any) {
        if (e?.code === 'P2002') throw new ConflictException(STALE);
        throw e;
      }
      return;
    }
    const r = await this.prisma.systemSetting.updateMany({ where: { key: settingKey(tenantId), value: prevRaw }, data: { value } });
    if (!r.count) throw new ConflictException(STALE);
  }

  private creds(t: Terminal): AuthorityCreds {
    let s: Partial<AuthorityCreds> = {};
    try { s = t.secret ? JSON.parse(decrypt(t.secret) ?? '{}') : {}; } catch { s = {}; }
    return { ...s, posId: t.posId, ntn: t.ntn };
  }

  /* ───────────────────────── SETTINGS ───────────────────────── */

  /** For the POS (any cashier): is this branch's tax sending on, and to whom. */
  async posStatus(tenantId: string, shopId: string | null) {
    const profiles = await this.read(tenantId);
    const p = shopId ? routeFor(profiles, shopId)?.profile : profiles.find((x) => x.enabled && x.startAt);
    return { enabled: !!p, authority: p?.authority ?? null, env: p?.env ?? null };
  }

  /** Settings screen. Secrets never leave the server: only whether one is saved. */
  async overview(user: AuthenticatedUser) {
    this.assert(user);
    const profiles = await this.read(user.tenantId);
    const shops = await this.prisma.shop.findMany({
      where: { tenantId: user.tenantId, isActive: true }, select: { id: true, name: true }, orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
    const activity: Partial<Record<Authority, { success: number; failed: number; pending: number; lastSentAt: Date | null }>> = {};
    let migrationPending = false;
    try {
      const g = await this.prisma.taxAuthorityInvoice.groupBy({
        by: ['authority', 'status'], where: { tenantId: user.tenantId }, _count: { _all: true }, _max: { submittedAt: true },
      });
      for (const x of g) {
        if (!isAuthority(x.authority)) continue;
        const a = (activity[x.authority] ??= { success: 0, failed: 0, pending: 0, lastSentAt: null });
        if (x.status === 'SUCCESS') {
          a.success += x._count._all;
          if (x._max.submittedAt && (!a.lastSentAt || x._max.submittedAt > a.lastSentAt)) a.lastSentAt = x._max.submittedAt;
        } else if (x.status === 'FAILED') a.failed += x._count._all;
        else if (x.status === 'PENDING') a.pending += x._count._all;
      }
    } catch (e) {
      if (!missingTable(e)) throw e;
      migrationPending = true;
    }
    // Prefill from the old FBR page when nothing is set up yet
    const legacy = profiles.length ? null : await this.prisma.fbrConfig.findUnique({ where: { tenantId: user.tenantId }, select: { ntn: true, posId: true, businessName: true } }).catch(() => null);
    return {
      profiles: profiles.map((p) => ({
        ...p,
        terminals: p.terminals.map((t) => {
          const cr = this.creds(t);
          return { shopId: t.shopId, posId: t.posId, ntn: t.ntn, user: cr.user ?? '', hasSecret: !!(cr.token || cr.pass || cr.key) };
        }),
      })),
      authorities: AUTHORITIES, defaults: DEFAULT_RATES, shops, activity, migrationPending,
      legacyFbr: legacy?.ntn || legacy?.posId ? legacy : null,
    };
  }

  /** Saves one authority's profile; the others stay as they are. */
  async save(user: AuthenticatedUser, body: any) {
    this.assert(user);
    if (!isAuthority(body?.authority)) throw new BadRequestException('Authority chunein: PRA, SRB, KPRA ya FBR');
    const authority: Authority = body.authority;
    const { raw, profiles } = await this.load(user.tenantId);
    const cur = profiles.find((p) => p.authority === authority) ?? null;
    const rates = DEFAULT_RATES[authority];
    const num = (v: unknown, d: number) => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 && n <= 50 ? n : d; };
    const shopIds = new Set((await this.prisma.shop.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })).map((s) => s.id));

    const terminals: Terminal[] = [];
    const input: any[] = Array.isArray(body?.terminals) ? body.terminals.slice(0, 50) : cur?.terminals ?? [];
    for (const t of input) {
      const shopId = t?.shopId && shopIds.has(t.shopId) ? String(t.shopId) : null;
      const posId = String(t?.posId ?? '').trim();
      const ntn = String(t?.ntn ?? '').trim();
      if (!posId || !ntn) throw new BadRequestException('Har POS ke liye POS ID aur NTN zaroori hai');
      if (authority !== 'KPRA' && !/^\d{1,19}$/.test(posId)) throw new BadRequestException(`POS ID me sirf number (${posId})`);
      if (terminals.some((x) => x.shopId === shopId)) throw new BadRequestException('Ek branch ka ek hi POS ID ho sakta hai');
      const old = cur?.terminals.find((x) => x.shopId === shopId);
      const prev = old ? this.creds(old) : ({} as AuthorityCreds);
      // Empty or masked input keeps the saved value
      const pick = (k: 'token' | 'user' | 'pass' | 'key') => {
        const v = t?.[k] === undefined || t?.[k] === null ? undefined : String(t[k]).trim();
        return v && !v.startsWith(MASK) ? v : prev[k];
      };
      const secret = { token: pick('token'), user: pick('user'), pass: pick('pass'), key: pick('key') };
      const has = authority === 'PRA' || authority === 'FBR' ? secret.token : authority === 'SRB' ? secret.user && secret.pass : secret.key;
      if (!has) throw new BadRequestException(authority === 'PRA' || authority === 'FBR' ? `${authority} token zaroori hai` : authority === 'SRB' ? 'SRB user aur password zaroori hain' : 'KPRA key zaroori hai');
      terminals.push({ shopId, posId, ntn, secret: encrypt(JSON.stringify(secret)) });
    }

    const enabled = body?.enabled === undefined ? !!cur?.enabled : !!body.enabled;
    if (enabled && !terminals.length) throw new BadRequestException('Pehle kam se kam ek POS ID jorein');
    const pctCode = String(body?.pctCode ?? cur?.pctCode ?? '').trim();
    if (enabled && (authority === 'PRA' || authority === 'FBR') && !/^\d{4}\.?\d{4}$/.test(pctCode)) {
      throw new BadRequestException(`${authority} ke liye 8 number ka PCT code chahiye (jaise 9801.2000). Yeh registration me milta hai.`);
    }

    const next: TaxAuthorityConfig = {
      authority, enabled,
      env: authority === 'KPRA' ? 'live' : body?.env === 'live' ? 'live' : body?.env === 'sandbox' ? 'sandbox' : cur?.env ?? 'sandbox',
      businessName: String(body?.businessName ?? cur?.businessName ?? '').trim().slice(0, 120),
      pctCode: pctCode.replace('.', ''),
      cashRate: num(body?.cashRate, cur?.cashRate ?? rates.cash),
      cardRate: num(body?.cardRate, cur?.cardRate ?? rates.card),
      onlyPos: body?.onlyPos === undefined ? cur?.onlyPos ?? true : !!body.onlyPos,
      terminals,
      // From the moment it is switched on; older bills are never sent
      startAt: enabled ? (cur?.enabled && cur.startAt ? cur.startAt : new Date().toISOString()) : null,
    };
    const all = [...profiles.filter((p) => p.authority !== authority), next];
    const clash = routingConflict(all);
    if (clash && next.enabled) throw new BadRequestException(await this.conflictText(user.tenantId, clash));
    await this.store(user.tenantId, raw, all);
    return this.overview(user);
  }

  private async conflictText(tenantId: string, c: RoutingConflict) {
    if (c.kind === 'fallback') return `"Sab branches" sirf ek authority me ho sakti hai. ${c.a} me pehle se hai. ${c.b} me har branch alag chunein.`;
    const shop = await this.prisma.shop.findFirst({ where: { id: c.shopId, tenantId }, select: { name: true } });
    return `${shop?.name ?? 'Yeh branch'} pehle se ${c.a} me hai. Ek branch ke bill sirf ek authority ko ja sakte hain.`;
  }

  /** Sends one sample bill on the sandbox. Never on live, where it would be a real tax invoice. */
  async test(user: AuthenticatedUser, body: { authority?: string; shopId?: string | null } = {}) {
    this.assert(user);
    const profiles = await this.read(user.tenantId);
    const p = isAuthority(body.authority) ? profiles.find((x) => x.authority === body.authority) : profiles[0];
    if (!p?.terminals.length) throw new BadRequestException('Pehle POS ID aur keys save karein');
    if (p.authority === 'KPRA') throw new BadRequestException('KPRA ka test server nahi hai, har bill asli hota hai. Chalu karne ke baad pehla bill Invoices me dekh lein.');
    if (p.env === 'live') throw new BadRequestException('Test sirf Sandbox par hota hai. Live par test bill bhi asli tax bill ban jata hai.');
    const term = body.shopId !== undefined ? p.terminals.find((t) => (t.shopId ?? null) === (body.shopId || null)) ?? p.terminals[0] : p.terminals[0];
    const bill: FiscalBill = {
      usin: `NAFAA-TEST-${Date.now()}`, kind: 'SALE', at: new Date(), total: 116, rate: p.cashRate, payment: 'CASH', buyer: {},
      lines: [{ code: 'TEST', name: 'Nafaa test item', qty: 1, total: 116 }], pctCode: p.pctCode, businessName: p.businessName || 'Nafaa test',
    };
    const { result } = await this.send(p, this.creds(term), bill);
    return {
      ok: result.ok, authority: p.authority, posId: term.posId, fiscalNumber: result.fiscalNumber ?? null,
      error: result.error ?? null, response: maskSecrets(result.response ?? null),
    };
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
      // PRA and FBR POS share the PRAL format; only the URL differs
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

  /** Sends one sale. Calling again returns the same answer; a bill is never sent twice. */
  async submitSale(tenantId: string, saleId: string) {
    const profiles = await this.read(tenantId);
    if (!profiles.some((p) => p.enabled)) return skip('Tax band hai');
    const rows = await this.prisma.taxAuthorityInvoice.findMany({ where: { tenantId, saleId, kind: 'SALE' }, orderBy: { createdAt: 'desc' } });
    const done = rows.find((r) => r.status === 'SUCCESS');
    if (done) return this.view(done);

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: { include: { product: { select: { name: true, sku: true, barcode: true } } } }, customer: true },
    });
    if (!sale) throw new NotFoundException('Sale nahi mili');
    if (sale.status === 'VOIDED') return skip('Void bill');

    // A bill stays with the authority it was first sent to
    const prior = rows[0] ?? null;
    let profile: TaxAuthorityConfig | undefined;
    let term: Terminal | null = null;
    if (prior) {
      profile = profiles.find((p) => p.authority === prior.authority && p.enabled);
      if (!profile) return skip(`${prior.authority} band hai`);
      term = terminalIn(profile, sale.shopId) ?? profile.terminals.find((t) => t.posId === prior.posId) ?? null;
    } else {
      const route = routeFor(profiles, sale.shopId);
      if (!route) return skip('Is branch ka POS ID nahi');
      profile = route.profile;
      term = route.terminal;
      if (profile.onlyPos && String(sale.source) !== 'POS') return skip('Online order: sirf POS ke bill jate hain');
      if (profile.startAt && sale.createdAt < new Date(profile.startAt)) return skip('Tax chalu hone se pehle ka bill');
    }
    if (!term) return skip('Is branch ka POS ID nahi');

    const rate = this.rateFor(profile, String(sale.paymentMethod));
    const bill: FiscalBill = {
      usin: sale.saleNumber, kind: 'SALE', at: sale.soldAt, total: Number(sale.total), rate, payment: String(sale.paymentMethod),
      buyer: { name: sale.customer?.name, phone: sale.customer?.phone, ntn: sale.customer?.ntn, cnic: sale.customer?.cnic, email: sale.customer?.email, address: sale.customer?.address },
      lines: sale.items.map((i) => ({ code: i.product?.sku || i.product?.barcode || i.productId || 'ITEM', name: i.product?.name ?? 'Item', qty: i.quantity, total: Number(i.total) })),
      pctCode: profile.pctCode, businessName: profile.businessName,
    };
    return this.record(tenantId, profile, term, bill, { saleId, returnId: '', shopId: sale.shopId, existing: prior });
  }

  /** Sends a return as a credit note, to the authority that accepted the original bill. */
  private async submitReturn(tenantId: string, profiles: TaxAuthorityConfig[], returnId: string) {
    const ret = await this.prisma.saleReturn.findFirst({ where: { id: returnId, tenantId } });
    if (!ret) return null;
    const sale = await this.prisma.sale.findFirst({ where: { id: ret.saleId, tenantId }, select: { id: true, saleNumber: true, shopId: true, paymentMethod: true } });
    if (!sale) return null;
    const orig = await this.prisma.taxAuthorityInvoice.findFirst({ where: { tenantId, saleId: sale.id, kind: 'SALE', status: 'SUCCESS' } });
    if (!orig) return null;
    const p = profiles.find((x) => x.authority === orig.authority && x.enabled);
    if (!p) return null;
    const existing = await this.prisma.taxAuthorityInvoice.findUnique({ where: { authority_kind_saleId_returnId: { authority: orig.authority, kind: 'RETURN', saleId: sale.id, returnId } } });
    if (existing?.status === 'SUCCESS') return this.view(existing);
    const term = terminalIn(p, sale.shopId) ?? p.terminals.find((t) => t.posId === orig.posId) ?? null;
    if (!term) return null;
    const bill: FiscalBill = {
      usin: ret.returnNumber, refUsin: sale.saleNumber, kind: 'RETURN', at: ret.returnedAt, total: Number(ret.refundAmount),
      rate: orig.taxRate || this.rateFor(p, String(sale.paymentMethod)), payment: String(ret.refundMethod), buyer: {},
      lines: [{ code: 'RETURN', name: `Return ${sale.saleNumber}`, qty: 1, total: Number(ret.refundAmount) }],
      pctCode: p.pctCode, businessName: p.businessName, reason: ret.reason ?? undefined,
    };
    return this.record(tenantId, p, term, bill, { saleId: sale.id, returnId, shopId: sale.shopId, existing });
  }

  private async record(tenantId: string, c: TaxAuthorityConfig, term: Terminal, bill: FiscalBill,
    o: { saleId: string; returnId: string; shopId: string | null; existing: TaxAuthorityInvoice | null }) {
    const t = splitTax(bill.total, bill.rate);
    const base = {
      tenantId, shopId: o.shopId, authority: c.authority, kind: bill.kind, saleId: o.saleId, returnId: o.returnId,
      usin: bill.usin, posId: term.posId, saleValue: t.value, taxAmount: t.tax, totalAmount: bill.total, taxRate: bill.rate,
    };

    let rowId: string;
    let attempts: number;
    if (o.existing) {
      const ex = o.existing;
      if (ex.status === 'PENDING' && Date.now() - ex.updatedAt.getTime() < IN_FLIGHT_MS) return this.view(ex);
      const claimed = await this.prisma.taxAuthorityInvoice.updateMany({
        where: { id: ex.id, status: { not: 'SUCCESS' }, updatedAt: ex.updatedAt }, data: { ...base, status: 'PENDING' },
      });
      if (!claimed.count) return this.view(await this.prisma.taxAuthorityInvoice.findUniqueOrThrow({ where: { id: ex.id } }));
      rowId = ex.id;
      attempts = ex.attempts;
    } else {
      try {
        const created = await this.prisma.taxAuthorityInvoice.create({ data: { ...base, status: 'PENDING' } });
        rowId = created.id;
        attempts = 0;
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e;
        const cur = await this.prisma.taxAuthorityInvoice.findUnique({ where: { authority_kind_saleId_returnId: { authority: c.authority, kind: bill.kind, saleId: o.saleId, returnId: o.returnId } } });
        return cur ? this.view(cur) : skip('Bheja ja raha hai');
      }
    }

    const { request, result } = await this.send(c, this.creds(term), bill);
    attempts += 1;
    const updated = await this.prisma.taxAuthorityInvoice.update({
      where: { id: rowId },
      data: {
        request: request as Prisma.InputJsonValue, response: result.response == null ? Prisma.DbNull : (result.response as Prisma.InputJsonValue), attempts, submittedAt: new Date(),
        status: result.ok ? 'SUCCESS' : 'FAILED',
        fiscalNumber: result.fiscalNumber ?? null, qrText: result.qrText ?? null, error: result.ok ? null : result.error ?? 'Ghalti',
        // Network/server errors retry soon; data errors retry slower (settings may get fixed)
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

  /** Called by every receipt page; never throws (tax off or table missing gives null). */
  async saleStatus(tenantId: string, saleId: string) {
    try {
      const rows = await this.prisma.taxAuthorityInvoice.findMany({ where: { tenantId, saleId, kind: 'SALE' }, orderBy: { createdAt: 'desc' }, take: 4 });
      const r = rows.find((x) => x.status === 'SUCCESS') ?? rows[0];
      return r ? this.view(r) : null;
    } catch {
      return null;
    }
  }

  /* ─────────────────────────── CRON ─────────────────────────── */

  @Cron('0 */2 * * * *')
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: 'tax_authority:' } }, select: { key: true, value: true } });
      for (const r of rows) {
        const profiles = readSetup(r.value);
        if (!profiles.some((p) => p.enabled && p.startAt)) continue;
        const tenantId = r.key.slice('tax_authority:'.length);
        await this.sweepTenant(tenantId, profiles).catch((e) => {
          if (missingTable(e)) {
            if (!this.tableMissingLogged) this.logger.warn('tax_authority_invoices table missing: run the migration');
            this.tableMissingLogged = true;
          } else this.logger.warn(`tax sweep ${tenantId}: ${e?.message ?? e}`);
        });
      }
    } finally {
      this.running = false;
    }
  }

  private async sweepTenant(tenantId: string, profiles: TaxAuthorityConfig[]) {
    const on = profiles.filter((p) => p.enabled && p.startAt);
    const now = new Date();
    // 1) Failed or stuck bills that are due again
    const due = await this.prisma.taxAuthorityInvoice.findMany({
      where: {
        tenantId, authority: { in: on.map((p) => p.authority) }, status: { in: ['FAILED', 'PENDING'] }, attempts: { lt: 12 },
        OR: [{ nextAttemptAt: { lte: now } }, { nextAttemptAt: null, updatedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }],
      },
      take: 30, orderBy: { createdAt: 'asc' }, select: { kind: true, saleId: true, returnId: true },
    });
    for (const d of due) {
      if (d.kind === 'SALE') await this.submitSale(tenantId, d.saleId).catch(() => null);
      else await this.submitReturn(tenantId, profiles, d.returnId).catch(() => null);
    }

    // 2) Bills never sent (offline bills, the web call did not happen): last 3 days
    for (const p of on) {
      const since = new Date(Math.max(Date.parse(p.startAt!), now.getTime() - 3 * DAY_MS));
      const sales = await this.prisma.sale.findMany({
        where: { tenantId, createdAt: { gte: since, lt: new Date(now.getTime() - 60_000) }, status: { not: 'VOIDED' }, ...(p.onlyPos && { source: 'POS' }), ...salesShopWhere(profiles, p) },
        select: { id: true }, orderBy: { createdAt: 'asc' }, take: 300,
      });
      if (!sales.length) continue;
      const done = new Set((await this.prisma.taxAuthorityInvoice.findMany({
        where: { tenantId, kind: 'SALE', saleId: { in: sales.map((s) => s.id) } }, select: { saleId: true },
      })).map((x) => x.saleId));
      for (const s of sales.filter((x) => !done.has(x.id)).slice(0, 50)) await this.submitSale(tenantId, s.id).catch(() => null);
    }

    // 3) Returns of bills an authority accepted
    const since = new Date(Math.max(Math.min(...on.map((p) => Date.parse(p.startAt!))), now.getTime() - 3 * DAY_MS));
    const rets = await this.prisma.saleReturn.findMany({ where: { tenantId, returnedAt: { gte: since } }, select: { id: true }, take: 100 });
    if (rets.length) {
      const done = new Set((await this.prisma.taxAuthorityInvoice.findMany({
        where: { tenantId, kind: 'RETURN', returnId: { in: rets.map((r) => r.id) } }, select: { returnId: true },
      })).map((x) => x.returnId));
      for (const r of rets.filter((x) => !done.has(x.id)).slice(0, 20)) await this.submitReturn(tenantId, profiles, r.id).catch(() => null);
    }
  }

  /* ───────────────────── INVOICES ───────────────────── */

  private async listWhere(user: AuthenticatedUser, scope: ShopScope, q: TaxQuery): Promise<Prisma.TaxAuthorityInvoiceWhereInput> {
    const shopId = this.branch(user, scope, q.shopId);
    const where: Prisma.TaxAuthorityInvoiceWhereInput = { tenantId: user.tenantId, ...(shopId && { shopId }) };
    if (isAuthority(q.authority)) where.authority = q.authority;
    if (q.kind === 'SALE' || q.kind === 'RETURN') where.kind = q.kind;
    const s = q.search?.trim().slice(0, 60);
    if (s) where.OR = [{ usin: { contains: s, mode: 'insensitive' } }, { fiscalNumber: { contains: s, mode: 'insensitive' } }];
    if (DAY_KEY.test(q.from ?? '') && DAY_KEY.test(q.to ?? '')) where.createdAt = await periodRange(this.tz, user.tenantId, q.from, q.to);
    return where;
  }

  async invoices(user: AuthenticatedUser, scope: ShopScope, q: TaxQuery) {
    this.assert(user);
    const page = Math.max(1, Number(q.page) || 1);
    const take = Math.min(200, Math.max(10, Number(q.limit) || 50));
    const base = await this.listWhere(user, scope, q);
    const where = { ...base, ...(q.status && STATUSES.includes(q.status) && { status: q.status }) };
    try {
      const [rows, total, grouped] = await Promise.all([
        this.prisma.taxAuthorityInvoice.findMany({
          where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take,
          select: { id: true, authority: true, kind: true, saleId: true, usin: true, posId: true, status: true, fiscalNumber: true, qrText: true, saleValue: true, taxAmount: true, totalAmount: true, taxRate: true, error: true, attempts: true, createdAt: true, submittedAt: true, nextAttemptAt: true, shopId: true },
        }),
        this.prisma.taxAuthorityInvoice.count({ where }),
        this.prisma.taxAuthorityInvoice.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      ]);
      const counts = Object.fromEntries(STATUSES.map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0]));
      return { rows, total, page, pages: Math.max(1, Math.ceil(total / take)), counts };
    } catch (e) {
      if (!missingTable(e)) throw e;
      return { rows: [], total: 0, page: 1, pages: 1, counts: {}, migrationPending: true };
    }
  }

  /** One invoice with what was sent and what the authority answered (credentials hidden). */
  async invoice(user: AuthenticatedUser, scope: ShopScope, id: string) {
    this.assert(user);
    const r = await this.prisma.taxAuthorityInvoice.findFirst({ where: { id, tenantId: user.tenantId, ...this.staffLock(user, scope) } });
    if (!r) throw new NotFoundException('Invoice nahi mili');
    const [sale, ret, shop, related, profiles] = await Promise.all([
      this.prisma.sale.findFirst({
        where: { id: r.saleId, tenantId: user.tenantId },
        select: { id: true, saleNumber: true, soldAt: true, total: true, paymentMethod: true, status: true, source: true, customer: { select: { name: true, phone: true } } },
      }),
      r.kind === 'RETURN' ? this.prisma.saleReturn.findFirst({ where: { id: r.returnId, tenantId: user.tenantId }, select: { id: true, returnNumber: true, returnedAt: true, refundAmount: true, reason: true } }) : null,
      r.shopId ? this.prisma.shop.findFirst({ where: { id: r.shopId, tenantId: user.tenantId }, select: { id: true, name: true } }) : null,
      this.prisma.taxAuthorityInvoice.findMany({
        where: { tenantId: user.tenantId, saleId: r.saleId, id: { not: r.id } }, orderBy: { createdAt: 'asc' },
        select: { id: true, authority: true, kind: true, usin: true, status: true, fiscalNumber: true, totalAmount: true, createdAt: true },
      }),
      this.read(user.tenantId),
    ]);
    const { request, response, ...rest } = r;
    return {
      ...rest, tenantId: undefined, label: this.view(r).label, request: maskSecrets(request), response: maskSecrets(response),
      sale, return: ret, shop, related,
      canRetry: r.status !== 'SUCCESS' && profiles.some((p) => p.authority === r.authority && p.enabled),
    };
  }

  /** "Dobara bhejein" for one bill; safe to press twice. */
  async retry(user: AuthenticatedUser, scope: ShopScope, id: string) {
    this.assert(user);
    const r = await this.prisma.taxAuthorityInvoice.findFirst({ where: { id, tenantId: user.tenantId, ...this.staffLock(user, scope) } });
    if (!r) throw new NotFoundException('Invoice nahi mili');
    if (r.status === 'SUCCESS') return this.view(r);
    const profiles = await this.read(user.tenantId);
    if (!profiles.some((p) => p.authority === r.authority && p.enabled)) throw new BadRequestException(`${r.authority} band hai. Pehle Tax settings me chalu karein.`);
    if (r.kind === 'SALE') return this.submitSale(user.tenantId, r.saleId);
    return (await this.submitReturn(user.tenantId, profiles, r.returnId)) ?? this.view(await this.prisma.taxAuthorityInvoice.findUniqueOrThrow({ where: { id } }));
  }

  /** Re-sends up to 100 failed bills in the background; one run per shop at a time. */
  async retryFailed(user: AuthenticatedUser, scope: ShopScope, body: { authority?: string } = {}) {
    this.assert(user);
    if (this.bulk.has(user.tenantId)) return { queued: 0, running: true };
    const profiles = await this.read(user.tenantId);
    const on = profiles.filter((p) => p.enabled && (!isAuthority(body.authority) || p.authority === body.authority)).map((p) => p.authority);
    if (!on.length) throw new BadRequestException('Koi authority chalu nahi');
    const rows = await this.prisma.taxAuthorityInvoice.findMany({
      where: { tenantId: user.tenantId, status: 'FAILED', authority: { in: on }, ...this.staffLock(user, scope) },
      orderBy: { createdAt: 'asc' }, take: 100, select: { kind: true, saleId: true, returnId: true },
    });
    if (!rows.length) return { queued: 0, running: false };
    this.bulk.add(user.tenantId);
    void (async () => {
      try {
        for (const r of rows) {
          if (r.kind === 'SALE') await this.submitSale(user.tenantId, r.saleId).catch(() => null);
          else await this.submitReturn(user.tenantId, profiles, r.returnId).catch(() => null);
        }
      } finally {
        this.bulk.delete(user.tenantId);
      }
    })();
    return { queued: rows.length, running: true };
  }

  /* ───────────────────── REPORTS ───────────────────── */

  /** Invoice rows whose bill falls in [start, end), with the bill's business day. */
  private async rowsBetween(tenantId: string, start: Date, end: Date, f: { authority?: string; shopId?: string }, clock: BusinessClock): Promise<InvRow[]> {
    // A row is created after its bill, so only the upper bound needs slack for late (offline) sends
    const recs = await this.prisma.taxAuthorityInvoice.findMany({
      where: { tenantId, ...(f.authority && { authority: f.authority }), ...(f.shopId && { shopId: f.shopId }), createdAt: { gte: new Date(start.getTime() - DAY_MS), lt: new Date(end.getTime() + 7 * DAY_MS) } },
      select: { status: true, kind: true, authority: true, shopId: true, saleValue: true, taxAmount: true, totalAmount: true, taxRate: true, saleId: true, returnId: true, createdAt: true, submittedAt: true },
    });
    const at = new Map<string, Date>();
    for (const ids of chunks([...new Set(recs.filter((r) => r.kind === 'SALE').map((r) => r.saleId))])) {
      for (const s of await this.prisma.sale.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, soldAt: true } })) at.set(s.id, s.soldAt);
    }
    for (const ids of chunks([...new Set(recs.filter((r) => r.kind === 'RETURN').map((r) => r.returnId))])) {
      for (const x of await this.prisma.saleReturn.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, returnedAt: true } })) at.set(x.id, x.returnedAt);
    }
    const out: InvRow[] = [];
    for (const r of recs) {
      const when = at.get(r.kind === 'SALE' ? r.saleId : r.returnId) ?? r.createdAt;
      if (when < start || when >= end) continue;
      out.push({ ...r, day: businessDayKey(when, clock.tz, clock.dayStartHour) });
    }
    return out;
  }

  private monthBounds(month: string, clock: BusinessClock) {
    const [y, m] = month.split('-').map(Number);
    return {
      start: startOfBusinessMonthTz(y, m, clock.tz, clock.dayStartHour),
      end: m === 12 ? startOfBusinessMonthTz(y + 1, 1, clock.tz, clock.dayStartHour) : startOfBusinessMonthTz(y, m + 1, clock.tz, clock.dayStartHour),
    };
  }

  /** Monthly sales-tax return figures, per authority, by day, rate and branch. */
  async report(user: AuthenticatedUser, scope: ShopScope, q: TaxQuery) {
    this.assert(user);
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const today = businessDayKey(new Date(), clock.tz, clock.dayStartHour);
    const month = /^\d{4}-\d{2}$/.test(q.month ?? '') ? q.month! : today.slice(0, 7);
    const { start, end } = this.monthBounds(month, clock);
    const f = { authority: isAuthority(q.authority) ? q.authority : undefined, shopId: this.branch(user, scope, q.shopId) };
    const profiles = await this.read(tenantId);
    let rows: InvRow[] = [];
    let migrationPending = false;
    try { rows = await this.rowsBetween(tenantId, start, end, f, clock); } catch (e) {
      if (!missingTable(e)) throw e;
      migrationPending = true;
    }
    const days = monthDays(month);
    const rep = monthlyReport(rows, days);
    const [shops, tenant] = await Promise.all([
      this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    const shopName = (id: string | null) => shops.find((s) => s.id === id)?.name ?? 'Branch ke baghair';
    const auths = byAuthority(rows, days).map((a) => {
      const p = profiles.find((x) => x.authority === a.authority);
      return {
        ...a, name: AUTHORITIES[a.authority as Authority]?.name ?? a.authority, businessName: p?.businessName ?? '',
        ntn: [...new Set(p?.terminals.map((t) => t.ntn) ?? [])], posIds: (p?.terminals ?? []).map((t) => ({ posId: t.posId, branch: t.shopId ? shopName(t.shopId) : 'Sab branches' })),
      };
    });
    const authority = f.authority ?? (auths.length === 1 ? auths[0].authority : null);
    const business = (authority && profiles.find((p) => p.authority === authority)?.businessName) || profiles.find((p) => p.businessName)?.businessName || tenant?.name || '';
    return {
      month, authority, business, period: { from: days[0], to: days[days.length - 1] },
      ...rep,
      byShop: rep.byShop.map((x) => ({ ...x, name: shopName(x.shopId) })),
      byAuthority: auths, health: health(rows), notSent: notSent(rows),
      shopId: f.shopId ?? null, shopName: f.shopId ? shopName(f.shopId) : null,
      migrationPending, generatedAt: new Date().toISOString(),
    };
  }

  async reportFile(user: AuthenticatedUser, scope: ShopScope, q: TaxQuery) {
    const r = await this.report(user, scope, q);
    const name = `tax-${r.authority ?? 'all'}-${r.month}${r.shopId ? '-branch' : ''}.csv`;
    return { name, body: reportCsv(r, { authority: r.authority ?? 'All authorities', month: r.month, business: r.business }) };
  }

  /** Overview for a period: totals, per-authority status, trend, this month against last, and bills still waiting. */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: TaxQuery) {
    this.assert(user);
    const tenantId = user.tenantId;
    const profiles = await this.read(tenantId);
    const clock = await this.tz.clock(tenantId);
    const now = new Date();
    const today = businessDayKey(now, clock.tz, clock.dayStartHour);
    let from = DAY_KEY.test(q.from ?? '') ? q.from! : `${today.slice(0, 7)}-01`;
    let to = DAY_KEY.test(q.to ?? '') ? q.to! : today;
    if (from > to) [from, to] = [to, from];
    const range = await periodRange(this.tz, tenantId, from, to);
    const f = { authority: isAuthority(q.authority) ? q.authority : undefined, shopId: this.branch(user, scope, q.shopId) };

    const thisMonth = today.slice(0, 7);
    const [ty, tm] = thisMonth.split('-').map(Number);
    const lastMonth = tm === 1 ? `${ty - 1}-12` : `${ty}-${String(tm - 1).padStart(2, '0')}`;
    const lastStart = this.monthBounds(lastMonth, clock).start;

    let rows: InvRow[] = [];
    let migrationPending = false;
    try {
      rows = await this.rowsBetween(tenantId, new Date(Math.min(range.gte.getTime(), lastStart.getTime())), new Date(Math.max(range.lt.getTime(), now.getTime() + 60_000)), f, clock);
    } catch (e) {
      if (!missingTable(e)) throw e;
      migrationPending = true;
    }

    const days = daysBetween(from, to);
    const inPeriod = rows.filter((r) => r.day >= from && r.day <= to);
    const monthly = days.length > 62;
    const series = monthly
      ? monthlyReport(inPeriod.map((r) => ({ ...r, day: r.day.slice(0, 7) })), [...new Set(days.map((d) => d.slice(0, 7)))]).daily
      : monthlyReport(inPeriod, days).daily;
    const ofMonth = (m: string, uptoDay?: string) =>
      ({ month: m, ...monthlyReport(rows.filter((r) => r.day.startsWith(m) && (!uptoDay || r.day.slice(8) <= uptoDay)), monthDays(m)).totals });

    const shown = profiles.filter((p) => p.enabled && (!f.authority || p.authority === f.authority)).map((p) => p.authority);
    const byAuth = byAuthority(inPeriod, days, shown).map((a) => {
      const p = profiles.find((x) => x.authority === a.authority);
      return { ...a, enabled: !!p?.enabled, env: p?.env ?? null };
    });

    const recentFails = migrationPending ? [] : await this.prisma.taxAuthorityInvoice.findMany({
      where: { tenantId, status: 'FAILED', ...(f.authority && { authority: f.authority }), ...(f.shopId && { shopId: f.shopId }) },
      orderBy: { updatedAt: 'desc' }, take: 5,
      select: { id: true, authority: true, usin: true, error: true, attempts: true, nextAttemptAt: true },
    });

    return {
      enabled: profiles.some((p) => p.enabled), migrationPending,
      profiles: profiles.map((p) => ({ authority: p.authority, enabled: p.enabled, env: p.env, startAt: p.startAt, terminals: p.terminals.length })),
      period: { from, to }, bucket: monthly ? 'month' : 'day',
      totals: monthlyReport(inPeriod, days).totals, notSent: notSent(inPeriod), health: health(inPeriod),
      byAuthority: byAuth, series,
      thisMonth: ofMonth(thisMonth), lastMonth: ofMonth(lastMonth), lastMonthToDate: ofMonth(lastMonth, today.slice(8)),
      missing: migrationPending ? 0 : await this.missingCount(tenantId, profiles, f, now),
      recentFails,
    };
  }

  /** Sales made after switching on (last 3 days) that have no tax row yet. */
  private async missingCount(tenantId: string, profiles: TaxAuthorityConfig[], f: { authority?: string; shopId?: string }, now: Date) {
    let missing = 0;
    for (const p of profiles.filter((x) => x.enabled && x.startAt && (!f.authority || x.authority === f.authority))) {
      const since = new Date(Math.max(Date.parse(p.startAt!), now.getTime() - 3 * DAY_MS));
      const sales = await this.prisma.sale.findMany({
        where: {
          tenantId, createdAt: { gte: since, lt: new Date(now.getTime() - 5 * 60_000) }, status: { not: 'VOIDED' }, ...(p.onlyPos && { source: 'POS' }),
          AND: [salesShopWhere(profiles, p), f.shopId ? { shopId: f.shopId } : {}],
        },
        select: { id: true }, take: 2000,
      });
      if (!sales.length) continue;
      const done = await this.prisma.taxAuthorityInvoice.count({ where: { tenantId, kind: 'SALE', saleId: { in: sales.map((s) => s.id) } } });
      missing += Math.max(0, sales.length - done);
    }
    return missing;
  }
}
