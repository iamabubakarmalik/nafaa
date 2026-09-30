import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { dateKeyTz } from '../../common/helpers/business-time.helper';
import { AccountingService } from './accounting.service';
import { TallySettings, dayBookCsv, ledgersUsed, mastersXml, mergeTallySettings, tallyVouchers, vouchersXml } from './tally';

const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const key = (tenantId: string) => `tally:${tenantId}`;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class TallyService {
  constructor(private readonly prisma: PrismaService, private readonly accounting: AccountingService) {}

  private assert(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Tally export sirf malik ya manager');
  }

  private async read(tenantId: string): Promise<TallySettings> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: key(tenantId) } });
    let raw: Partial<TallySettings> | null = null;
    try { raw = row?.value ? JSON.parse(row.value) : null; } catch { raw = null; }
    return mergeTallySettings(raw);
  }

  async settings(user: AuthenticatedUser) {
    this.assert(user);
    return this.read(user.tenantId);
  }

  async save(user: AuthenticatedUser, body: Partial<TallySettings>) {
    this.assert(user);
    const cur = await this.read(user.tenantId);
    const next = mergeTallySettings({ ...cur, ...body, mapping: { ...cur.mapping, ...(body.mapping ?? {}), methods: { ...cur.mapping.methods, ...(body.mapping?.methods ?? {}) } } });
    const value = JSON.stringify(next);
    await this.prisma.systemSetting.upsert({
      where: { key: key(user.tenantId) },
      create: { key: key(user.tenantId), value, category: 'accounting', isPublic: false },
      update: { value },
    });
    return next;
  }

  private days(from: string, to: string) {
    if (!DAY.test(from) || !DAY.test(to)) throw new BadRequestException('Tareekh YYYY-MM-DD');
    const a = Date.parse(`${from}T00:00:00Z`), b = Date.parse(`${to}T00:00:00Z`);
    if (b < a) throw new BadRequestException('"Tak" tareekh "Se" ke baad honi chahiye');
    const n = Math.round((b - a) / 86_400_000) + 1;
    if (n > 93) throw new BadRequestException('Ek dafa me zyada se zyada 3 mahine');
    if (to > dateKeyTz(new Date())) throw new BadRequestException('Aane wale din ka export nahi');
    return Array.from({ length: n }, (_, i) => new Date(a + i * 86_400_000).toISOString().slice(0, 10));
  }

  async build(user: AuthenticatedUser, q: { from?: string; to?: string }) {
    this.assert(user);
    const s = await this.read(user.tenantId);
    const days = this.days(String(q.from ?? ''), String(q.to ?? ''));
    const vouchers = [];
    for (const d of days) vouchers.push(...tallyVouchers(d, await this.accounting.dayData(user.tenantId, d, s.includeExpenses), s));
    return { s, days, vouchers };
  }

  /** Screen par: kitne voucher, kaunse ledger, totals */
  async preview(user: AuthenticatedUser, q: { from?: string; to?: string }) {
    const { s, days, vouchers } = await this.build(user, q);
    const sum = (k: string) => Math.round(vouchers.filter((v) => v.kind === k).reduce((t, v) => t + v.lines.filter((l) => l.side === 'debit').reduce((a, l) => a + l.amount, 0), 0) * 100) / 100;
    return {
      days: days.length,
      vouchers: vouchers.length,
      ledgers: ledgersUsed(vouchers, s),
      totals: { sales: sum('sales'), refunds: sum('refund'), collections: sum('receipt'), expenses: sum('expense'), cogs: sum('cogs') },
      sample: vouchers.slice(0, 5),
    };
  }

  async file(user: AuthenticatedUser, q: { from?: string; to?: string; format?: string }) {
    const { s, vouchers } = await this.build(user, q);
    const tag = `${q.from}_to_${q.to}`;
    if (q.format === 'csv') return { name: `nafaa-daybook-${tag}.csv`, type: 'text/csv; charset=utf-8', body: dayBookCsv(vouchers) };
    if (q.format === 'masters') return { name: `nafaa-tally-ledgers-${tag}.xml`, type: 'application/xml; charset=utf-8', body: mastersXml(ledgersUsed(vouchers, s), s) };
    if (!vouchers.length) throw new BadRequestException('In dino me koi sale / kharcha nahi — export ke liye kuch nahi');
    return { name: `nafaa-tally-vouchers-${tag}.xml`, type: 'application/xml; charset=utf-8', body: vouchersXml(user.tenantId, vouchers, s) };
  }
}
