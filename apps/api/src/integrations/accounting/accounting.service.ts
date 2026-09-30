import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { dateKeyTz, subDaysTz } from '../../common/helpers/business-time.helper';
import { AccountMapping, DayData, buildDailyJournal } from './daily-journal';
import { ACCT_PROVIDERS, acctProvider } from './registry';
import { AcctApiError, AcctConnection } from './types';

const key = (tenantId: string) => `accounting:${tenantId}`;
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];

export interface SyncRecord { day: string; status: 'SUCCESS' | 'FAILED' | 'SKIPPED'; journalId?: string | null; error?: string | null; at: string; totals?: any }

export interface Stored {
  provider: string;
  conn: string; // encrypted JSON AcctConnection
  companyName: string | null;
  currency: string | null;
  connectedAt: string;
  mapping: AccountMapping;
  includeCogs: boolean;
  includeExpenses: boolean;
  autoSync: boolean;
  history: SyncRecord[];
  lastError?: string | null;
}

/** "2026-09-30" → us din ka UTC range (Pakistan waqt) */
export function pkDayRange(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new BadRequestException('Tareekh YYYY-MM-DD');
  const start = new Date(`${day}T00:00:00+05:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

/**
 * Accounting — Zoho Books / QuickBooks / Xero. Har din ek summary journal
 * (sale payment-tareeqe ke hisaab se, udhaar, discount, refund, udhaar
 * wapsi, kharche, optional COGS) dukandar ke apne accounts me.
 */
@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  private web() {
    return (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
  }

  private apiBase() {
    const raw = (process.env.INTEGRATIONS_API_URL || process.env.API_URL || 'https://api.nafaa.pk/api').replace(/\/+$/, '');
    return /\/api$/.test(raw) ? raw : `${raw}/api`;
  }

  redirectUri(provider: string) {
    return `${this.apiBase()}/integrations/accounting/${provider.toLowerCase()}/callback`;
  }

  private assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new UnauthorizedException('Accounting sirf malik ya manager jor sakta hai');
  }

  private async read(tenantId: string): Promise<Stored | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: key(tenantId) } });
    try { return row?.value ? JSON.parse(row.value) : null; } catch { return null; }
  }

  private async write(tenantId: string, s: Stored) {
    const value = JSON.stringify(s);
    await this.prisma.systemSetting.upsert({
      where: { key: key(tenantId) },
      create: { key: key(tenantId), value, category: 'accounting', isPublic: false },
      update: { value },
    });
  }

  private connOf(s: Stored): AcctConnection {
    return JSON.parse(decrypt(s.conn) ?? '{}');
  }

  /** Token khatam hone wala ho to naya (aur save) */
  private async liveConn(tenantId: string, s: Stored): Promise<AcctConnection> {
    const p = this.providerOrThrow(s.provider);
    let conn = this.connOf(s);
    if (Date.parse(conn.expiresAt) - Date.now() < 2 * 60_000) {
      try {
        const t = await p.refresh(conn);
        conn = { ...conn, ...t };
        await this.write(tenantId, { ...s, conn: encrypt(JSON.stringify(conn))!, lastError: null });
      } catch (e: any) {
        await this.write(tenantId, { ...s, lastError: e?.message ?? 'Token refresh fail' });
        throw this.http(e);
      }
    }
    return conn;
  }

  // ═══════════════════════════════════════════════════════════
  // CONNECT
  // ═══════════════════════════════════════════════════════════

  async status(user: AuthenticatedUser) {
    const s = await this.read(user.tenantId);
    return {
      providers: Object.values(ACCT_PROVIDERS).map((p) => ({ code: p.code, name: p.name, configured: p.configured() })),
      connected: s
        ? {
            provider: s.provider, name: ACCT_PROVIDERS[s.provider]?.name ?? s.provider, companyName: s.companyName, currency: s.currency,
            connectedAt: s.connectedAt, mapping: s.mapping, includeCogs: s.includeCogs, includeExpenses: s.includeExpenses, autoSync: s.autoSync,
            lastError: s.lastError ?? null, history: s.history.slice(0, 30),
          }
        : null,
    };
  }

  start(user: AuthenticatedUser, provider: string, returnOrigin?: string) {
    this.assertManager(user);
    const p = this.providerOrThrow(provider);
    if (!p.configured()) throw new BadRequestException(`${p.name} app ki keys server par nahi lagi — Nafaa admin se kahein`);
    return { authUrl: p.authorizeUrl(this.signState(user.tenantId, p.code, this.webOrigin(returnOrigin)), this.redirectUri(p.code)) };
  }

  async callback(provider: string, query: Record<string, string>) {
    let web = this.web();
    try {
      const { tenantId, origin } = this.verifyState(String(query.state ?? ''), provider.toUpperCase());
      web = origin;
      const p = this.providerOrThrow(provider);
      const got = await p.exchange(query, this.redirectUri(p.code));
      const conn: AcctConnection = { provider: p.code, ...got };
      const prev = await this.read(tenantId);
      // Wahi software dobara jora to mapping aur history rehne do
      const same = prev?.provider === p.code;
      await this.write(tenantId, {
        provider: p.code,
        conn: encrypt(JSON.stringify(conn))!,
        companyName: conn.companyName,
        currency: conn.currency,
        connectedAt: new Date().toISOString(),
        mapping: same ? prev!.mapping : {},
        includeCogs: same ? prev!.includeCogs : false,
        includeExpenses: same ? prev!.includeExpenses : true,
        autoSync: same ? prev!.autoSync : false,
        history: same ? prev!.history : [],
        lastError: null,
      });
      return `${web}/settings/accounting?connected=1`;
    } catch (e: any) {
      this.logger.warn(`Accounting callback ${provider}: ${e?.message}`);
      return `${web}/settings/accounting?error=${encodeURIComponent(String(e?.response?.message ?? e?.message ?? 'Masla hua').slice(0, 200))}`;
    }
  }

  async disconnect(user: AuthenticatedUser) {
    this.assertManager(user);
    await this.prisma.systemSetting.deleteMany({ where: { key: key(user.tenantId) } });
    return { ok: true };
  }

  async accounts(user: AuthenticatedUser) {
    const s = await this.mustRead(user.tenantId);
    const conn = await this.liveConn(user.tenantId, s);
    try {
      return await this.providerOrThrow(s.provider).accounts(conn);
    } catch (e) {
      throw this.http(e);
    }
  }

  async updateSettings(user: AuthenticatedUser, body: { mapping?: AccountMapping; includeCogs?: boolean; includeExpenses?: boolean; autoSync?: boolean }) {
    this.assertManager(user);
    const s = await this.mustRead(user.tenantId);
    const clean = (v: unknown) => (v ? String(v).slice(0, 80) : null);
    const m = body?.mapping;
    const mapping: AccountMapping = m
      ? {
          sales: clean(m.sales), discounts: clean(m.discounts), returns: clean(m.returns), receivable: clean(m.receivable),
          cogs: clean(m.cogs), inventory: clean(m.inventory), expenseDefault: clean(m.expenseDefault),
          methods: Object.fromEntries(Object.entries(m.methods ?? {}).map(([k, v]) => [k, clean(v)])),
          expenseByCategory: Object.fromEntries(Object.entries(m.expenseByCategory ?? {}).slice(0, 200).map(([k, v]) => [k, clean(v)])),
          collectionMethod: m.collectionMethod ?? 'CASH',
        }
      : s.mapping;
    const next: Stored = {
      ...s,
      mapping,
      includeCogs: body?.includeCogs ?? s.includeCogs,
      includeExpenses: body?.includeExpenses ?? s.includeExpenses,
      autoSync: body?.autoSync ?? s.autoSync,
    };
    await this.write(user.tenantId, next);
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // DIN KA DATA + JOURNAL
  // ═══════════════════════════════════════════════════════════

  async dayData(tenantId: string, day: string, includeExpenses: boolean): Promise<DayData> {
    const { start, end } = pkDayRange(day);
    const [sales, returns, collections, expenses] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, soldAt: { gte: start, lt: end }, status: { not: 'VOIDED' } },
        select: { subtotal: true, discount: true, total: true, creditAmount: true, paymentMethod: true, costOfGoods: true },
      }),
      this.prisma.saleReturn.findMany({ where: { tenantId, returnedAt: { gte: start, lt: end } }, select: { refundAmount: true, refundMethod: true } }),
      this.prisma.customerLedger.findMany({ where: { tenantId, type: 'PAYMENT_RECEIVED', createdAt: { gte: start, lt: end } }, select: { amount: true } }),
      includeExpenses
        ? this.prisma.expense.findMany({
            where: { tenantId, expenseDate: { gte: start, lt: end }, status: 'PAID' as any },
            select: { amount: true, paymentMethod: true, categoryId: true, category: { select: { name: true } } } as any,
          })
        : Promise.resolve([]),
    ]);
    return {
      sales: sales.map((x) => ({ ...x, paymentMethod: String(x.paymentMethod) })),
      returns: returns.map((x) => ({ refundAmount: x.refundAmount, refundMethod: String(x.refundMethod) })),
      collections: collections.map((c) => ({ amount: Math.abs(Number(c.amount)) })),
      expenses: (expenses as any[]).map((e) => ({ amount: Number(e.amount), paymentMethod: String(e.paymentMethod), categoryId: e.categoryId ?? null, categoryName: e.category?.name ?? null })),
    };
  }

  async preview(user: AuthenticatedUser, day: string) {
    const s = await this.mustRead(user.tenantId);
    const data = await this.dayData(user.tenantId, day, s.includeExpenses);
    return buildDailyJournal(data, s.mapping, { includeCogs: s.includeCogs });
  }

  /** Ek din ka journal bhejo — pehle se gaya ho to dobara nahi (force na ho) */
  async syncDay(tenantId: string, day: string, opts: { force?: boolean } = {}): Promise<SyncRecord> {
    const s = await this.mustRead(tenantId);
    const done = s.history.find((h) => h.day === day && h.status === 'SUCCESS');
    if (done && !opts.force) return { ...done, status: 'SKIPPED' };
    const record = (r: Omit<SyncRecord, 'day' | 'at'>): SyncRecord => ({ day, at: new Date().toISOString(), ...r });

    let result: SyncRecord;
    try {
      const data = await this.dayData(tenantId, day, s.includeExpenses);
      const j = buildDailyJournal(data, s.mapping, { includeCogs: s.includeCogs });
      if (j.missing.length) throw new BadRequestException(`Pehle accounts chunein: ${j.missing.join(', ')}`);
      if (!j.lines.length) {
        result = record({ status: 'SKIPPED', error: 'Is din koi sale / kharcha nahi', totals: j.totals });
      } else {
        const p = this.providerOrThrow(s.provider);
        const conn = await this.liveConn(tenantId, s);
        const ref = `NAFAA-${day}`;
        const existing = p.findByRef ? await p.findByRef(conn, ref).catch(() => null) : null;
        if (existing && !opts.force) {
          result = record({ status: 'SUCCESS', journalId: existing, totals: j.totals, error: 'Pehle se bheja hua mila' });
        } else {
          const r = await p.postJournal(conn, {
            date: day,
            ref,
            notes: `Nafaa POS — ${day}: ${j.totals.bills} bill, sale Rs ${j.totals.sales}${j.totals.expenses ? `, kharche Rs ${j.totals.expenses}` : ''}`,
            lines: j.lines,
          });
          result = record({ status: 'SUCCESS', journalId: r.id, totals: j.totals });
        }
      }
    } catch (e: any) {
      result = record({ status: 'FAILED', error: String(e?.response?.message ?? e?.message ?? 'Masla').slice(0, 300) });
    }
    const fresh = (await this.read(tenantId)) ?? s;
    await this.write(tenantId, {
      ...fresh,
      history: [result, ...fresh.history.filter((h) => h.day !== day)].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 120),
      lastError: result.status === 'FAILED' ? result.error ?? null : fresh.lastError ?? null,
    });
    return result;
  }

  async sync(user: AuthenticatedUser, body: { day?: string; force?: boolean }) {
    this.assertManager(user);
    const day = body?.day ?? dateKeyTz(subDaysTz(new Date(), 1));
    if (day >= dateKeyTz(new Date())) throw new BadRequestException('Aaj ka din abhi khatam nahi hua — kal bhejein');
    return this.syncDay(user.tenantId, day, { force: !!body?.force });
  }

  /** Har raat ~12:40 (Pakistan): kal ka din + pichhle 7 din ke fail */
  @Cron('0 40 19 * * *')
  async nightly() {
    if (this.running || process.env.DISABLE_ACCOUNTING_SYNC === '1') return;
    this.running = true;
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: 'accounting:' } } });
      for (const row of rows) {
        const tenantId = row.key.slice('accounting:'.length);
        let s: Stored;
        try { s = JSON.parse(row.value); } catch { continue; }
        if (!s.autoSync) continue;
        for (let d = 7; d >= 1; d--) {
          const day = dateKeyTz(subDaysTz(new Date(), d));
          const h = s.history.find((x) => x.day === day);
          if (d > 1 && (!h || h.status !== 'FAILED')) continue; // purane sirf retry
          if (h?.status === 'SUCCESS') continue;
          await this.syncDay(tenantId, day).catch((e) => this.logger.warn(`Accounting ${tenantId} ${day}: ${e?.message}`));
        }
      }
    } finally {
      this.running = false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private async mustRead(tenantId: string) {
    const s = await this.read(tenantId);
    if (!s) throw new BadRequestException('Koi accounting software jura nahi');
    return s;
  }

  private providerOrThrow(code: string) {
    const p = acctProvider(code);
    if (!p) throw new BadRequestException('Ye accounting software Nafaa me nahi');
    return p;
  }

  private http(e: unknown) {
    if (e instanceof AcctApiError) return new BadRequestException(e.message);
    return e;
  }

  private webOrigin(requested?: string) {
    const fallback = this.web();
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
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-acct';
  }

  private signState(tenantId: string, provider: string, origin: string) {
    const payload = `${tenantId}.${provider}.${Date.now() + 15 * 60_000}.${Buffer.from(origin).toString('base64url')}`;
    return `${Buffer.from(payload).toString('base64url')}.${crypto.createHmac('sha256', this.secret()).update(`acct:${payload}`).digest('hex').slice(0, 32)}`;
  }

  private verifyState(state: string, provider: string) {
    const [b64, sig] = state.split('.');
    if (!b64 || !sig) throw new UnauthorizedException('Ghalat request');
    const payload = Buffer.from(b64, 'base64url').toString();
    const expected = crypto.createHmac('sha256', this.secret()).update(`acct:${payload}`).digest('hex').slice(0, 32);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new UnauthorizedException('Ghalat request');
    const [tenantId, p, exp, o] = payload.split('.');
    if (p !== provider) throw new UnauthorizedException('Ghalat request');
    if (Date.now() > Number(exp)) throw new UnauthorizedException('Link purana — dobara "Jorein" dabayein');
    return { tenantId, origin: this.webOrigin(Buffer.from(o, 'base64url').toString()) };
  }
}
