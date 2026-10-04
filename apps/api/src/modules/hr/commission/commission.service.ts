import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SaleStatus, CommissionValueType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { startOfBusinessMonthTz } from '../../../common/helpers/business-time.helper';
import { UpsertRuleDto } from './dto/upsert-rule.dto';
import { EnrollDto } from './dto/enroll.dto';
import { PayoutDto } from './dto/payout.dto';

/* ═════════════════════════════════════════════════════════════
   COMMISSION — hisab server par
   ─────────────────────────────────────────────────────────────
   Hisab kahin store nahi hota. Har dafa asli bikri se banta hai,
   is liye purana bill void ho jaye ya wapsi ho to commission
   apne aap theek ho jati hai — koi "dobara calculate karein"
   wala button nahi chahiye.

   Mahine ki haddein dukaan ke apne timezone (Asia/Karachi) se
   banti hain, server ke UTC se nahi. Warna 1 tareekh ki subah
   paanch baje tak ki bikri pichhle mahine me gir jati.
   ═════════════════════════════════════════════════════════════ */

/** Void aur poori wapsi wale bill commission me nahi aate */
const COUNTED_STATUSES: SaleStatus[] = [SaleStatus.COMPLETED, SaleStatus.PARTIALLY_RETURNED];

interface Line {
  ruleId: string;
  label: string;
  base: number;
  rate: number;
  valueType: string;
  amount: number;
}

const num = (v: unknown) => Number(v ?? 0) || 0;

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tzService: TenantTimezoneService,
  ) {}

  /* ══════════ RULES ══════════ */

  listRules(user: AuthenticatedUser) {
    return this.prisma.commissionRule.findMany({
      where: { tenantId: user.tenantId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async upsertRule(user: AuthenticatedUser, dto: UpsertRuleDto, id?: string) {
    if (dto.valueType === 'PERCENT' && dto.value > 100) {
      throw new BadRequestException('Percent 100 se zyada nahi ho sakta');
    }
    if (dto.value <= 0) {
      throw new BadRequestException('Commission ki raqam 0 se zyada honi chahiye');
    }
    if (dto.targetAmount && !dto.targetBonus) {
      throw new BadRequestException('Target likha hai to bonus bhi likhein');
    }

    const data = {
      name: dto.name ?? null,
      userId: dto.userId || null,
      basis: dto.basis,
      valueType: (dto.valueType ?? 'PERCENT') as CommissionValueType,
      value: dto.value,
      categoryIds: dto.categoryIds ?? [],
      minMonthlySale: dto.minMonthlySale ?? null,
      targetAmount: dto.targetAmount ?? null,
      targetBonus: dto.targetBonus ?? null,
      isActive: dto.isActive ?? true,
      note: dto.note ?? null,
    };

    if (id) {
      const existing = await this.prisma.commissionRule.findFirst({
        where: { id, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Rule nahi mila');
      return this.prisma.commissionRule.update({ where: { id }, data });
    }

    return this.prisma.commissionRule.create({
      data: { tenantId: user.tenantId, ...data },
    });
  }

  async removeRule(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.commissionRule.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Rule nahi mila');
    await this.prisma.commissionRule.delete({ where: { id } });
    return { ok: true };
  }

  /* ══════════ KIS PAR CHAALU ══════════ */

  /**
   * Jo log bech sakte hain, un ki poori list — sath me HR ka record.
   *
   * Staff (HR) aur User (login) do alag cheezein hain. Bikri hamesha
   * login ke naam lagti hai, is liye jis employee ka login hi nahi
   * uski commission nahi ban sakti. Hum wo employee bhi list me
   * dikhate hain, is nishani ke sath ke us ka login nahi — taake
   * malik ko pata chale ke karna kya hai.
   */
  async listPeople(user: AuthenticatedUser) {
    const [users, staff, enrollments] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, fullName: true, email: true, phone: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.staff.findMany({
        where: { tenantId: user.tenantId, status: { not: 'TERMINATED' } },
        select: {
          id: true, userId: true, staffNumber: true, fullName: true,
          designation: true, salaryType: true, baseSalary: true,
          phone: true, email: true, status: true, avatarUrl: true,
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.commissionEnrollment.findMany({
        where: { tenantId: user.tenantId },
      }),
    ]);

    const enrollByUser = new Map(enrollments.map((e) => [e.userId, e]));

    /* Staff ko login se jorna: pehle seedha userId, phir email, phir
       phone ke aakhri 10 ank (0300-1234567 aur +923001234567 ek hi hain) */
    const digits = (v?: string | null) => (v ?? '').replace(/[^0-9]/g, '').slice(-10);
    const staffByUserId = new Map<string, (typeof staff)[number]>();
    const staffByEmail = new Map<string, (typeof staff)[number]>();
    const staffByPhone = new Map<string, (typeof staff)[number]>();
    staff.forEach((st) => {
      if (st.userId) staffByUserId.set(st.userId, st);
      if (st.email) staffByEmail.set(st.email.toLowerCase().trim(), st);
      const d = digits(st.phone);
      if (d.length >= 10) staffByPhone.set(d, st);
    });

    const matchedStaffIds = new Set<string>();

    const people = users.map((u) => {
      const st =
        staffByUserId.get(u.id) ??
        staffByEmail.get((u.email ?? '').toLowerCase().trim()) ??
        staffByPhone.get(digits(u.phone));
      if (st) matchedStaffIds.add(st.id);
      const en = enrollByUser.get(u.id);
      return {
        userId: u.id,
        name: st?.fullName ?? u.fullName,
        email: u.email,
        phone: u.phone ?? st?.phone ?? null,
        role: u.role,
        canSell: true,
        staff: st
          ? {
              id: st.id, staffNumber: st.staffNumber, designation: st.designation,
              salaryType: st.salaryType, baseSalary: st.baseSalary,
              status: st.status, avatarUrl: st.avatarUrl,
              /* Jis staff ka userId abhi khali hai, us par nishan laga
                 dete hain taake malik ek click me pakka jor sake */
              linkedByGuess: !st.userId,
            }
          : null,
        enrolled: !!en?.isActive,
        since: en?.since ?? null,
      };
    });

    /* Wo employee jin ka koi login nahi — in ki bikri darj hi nahi hoti */
    const withoutLogin = staff
      .filter((st) => !matchedStaffIds.has(st.id))
      .map((st) => ({
        userId: null,
        name: st.fullName,
        email: st.email,
        phone: st.phone,
        role: null,
        canSell: false,
        staff: {
          id: st.id, staffNumber: st.staffNumber, designation: st.designation,
          salaryType: st.salaryType, baseSalary: st.baseSalary,
          status: st.status, avatarUrl: st.avatarUrl, linkedByGuess: false,
        },
        enrolled: false,
        since: null,
      }));

    return { people, withoutLogin };
  }

  async setEnrolled(user: AuthenticatedUser, dto: EnrollDto) {
    const target = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Ye banda is dukaan me nahi mila');

    if (!dto.isActive) {
      await this.prisma.commissionEnrollment.deleteMany({
        where: { tenantId: user.tenantId, userId: dto.userId },
      });
      return { ok: true, enrolled: false };
    }

    /* Agar HR record diya hai aur us ka login abhi khali hai, to
       wahin pakka jor dete hain — agli dafa andaza lagana nahi parega */
    if (dto.staffId) {
      await this.prisma.staff.updateMany({
        where: { id: dto.staffId, tenantId: user.tenantId, userId: null },
        data: { userId: dto.userId },
      });
    }

    const row = await this.prisma.commissionEnrollment.upsert({
      where: { tenantId_userId: { tenantId: user.tenantId, userId: dto.userId } },
      create: {
        tenantId: user.tenantId, userId: dto.userId,
        staffId: dto.staffId ?? null, isActive: true, note: dto.note ?? null,
      },
      update: { isActive: true, staffId: dto.staffId ?? null, note: dto.note ?? null },
    });
    return { ok: true, enrolled: true, id: row.id };
  }

  /* ══════════ ADAIGI ══════════ */

  async pay(user: AuthenticatedUser, dto: PayoutDto) {
    return this.prisma.commissionPayout.upsert({
      where: {
        tenantId_userId_period: {
          tenantId: user.tenantId, userId: dto.userId, period: dto.period,
        },
      },
      create: {
        tenantId: user.tenantId, userId: dto.userId, period: dto.period,
        amount: dto.amount, note: dto.note ?? null, paidBy: user.id ?? null,
      },
      update: { amount: dto.amount, note: dto.note ?? null, paidAt: new Date() },
    });
  }

  async undoPay(user: AuthenticatedUser, userId: string, period: string) {
    await this.prisma.commissionPayout.deleteMany({
      where: { tenantId: user.tenantId, userId, period },
    });
    return { ok: true };
  }

  /* ══════════ HISAB ══════════ */

  /** "2026-10" → us mahine ki shuruaat aur ikhtitam, dukaan ke waqt par */
  private async monthRange(tenantId: string, period: string) {
    const m = /^(\d{4})-(\d{2})$/.exec(period);
    if (!m) throw new BadRequestException('Mahina "2026-10" ki shakal me dein');
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) throw new BadRequestException('Mahina 01 se 12 ke beech ho');

    /* Mahina dukaan ke apne karobari din par palatta hai. Jo dukaan
       raat 2 baje band hoti hai aur din 4 baje shuru karti hai, us ke
       liye 1 tareekh raat 1 baje ki bikri pichhle mahine ki hai. */
    const { tz, dayStartHour } = await this.tzService.clock(tenantId);
    const from = startOfBusinessMonthTz(year, month, tz, dayStartHour);
    const nextY = month === 12 ? year + 1 : year;
    const nextM = month === 12 ? 1 : month + 1;
    const to = startOfBusinessMonthTz(nextY, nextM, tz, dayStartHour);
    return { from, to, tz, dayStartHour };
  }

  /**
   * Ek mahine ka poora hisab.
   *
   * Sab kuch ek hi jagah: har bande ki bikri, har rule ki line, aur
   * (jab maanga jaye) har cheez aur har bill ki tafseel — taake
   * sawal "ye paisa kahan se aaya" ka jawab safhe par hi mil jaye.
   */
  async summary(user: AuthenticatedUser, period: string, opts: { detail?: boolean } = {}) {
    const { from, to, tz, dayStartHour } = await this.monthRange(user.tenantId, period);

    const [rules, enrollments, sales, payouts, staff] = await Promise.all([
      this.prisma.commissionRule.findMany({
        where: { tenantId: user.tenantId, isActive: true },
      }),
      this.prisma.commissionEnrollment.findMany({
        where: { tenantId: user.tenantId, isActive: true },
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId: user.tenantId,
          soldAt: { gte: from, lt: to },
          status: { in: COUNTED_STATUSES },
        },
        select: {
          id: true, saleNumber: true, total: true, costOfGoods: true,
          discount: true, soldAt: true, status: true,
          createdById: true, soldById: true,
          createdBy: { select: { id: true, fullName: true } },
          soldBy: { select: { id: true, fullName: true } },
          customer: { select: { id: true, name: true } },
          items: {
            select: {
              quantity: true, returnedQty: true, price: true, total: true, costPrice: true,
              product: {
                select: {
                  id: true, name: true, unit: true, categoryId: true,
                  category: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { soldAt: 'desc' },
      }),
      this.prisma.commissionPayout.findMany({
        where: { tenantId: user.tenantId, period },
      }),
      this.prisma.staff.findMany({
        where: { tenantId: user.tenantId },
        select: {
          id: true, userId: true, staffNumber: true, designation: true,
          salaryType: true, baseSalary: true, status: true,
        },
      }),
    ]);

    const enrolledIds = new Set(enrollments.map((e) => e.userId));
    const payoutByUser = new Map(payouts.map((p) => [p.userId, p]));
    const staffByUser = new Map(staff.filter((s) => s.userId).map((s) => [s.userId as string, s]));

    /* Bande ke hisab se bill. Jin bill par koi login darj nahi, un ki
       commission kisi ko nahi milti — un ki ginti alag se batate hain. */
    const byUser = new Map<string, typeof sales>();
    let orphanBills = 0;
    let orphanSale = 0;
    let reassignedBills = 0;
    sales.forEach((sale) => {
      /* Counter par aksar ek hi cashier bill banata hai, magar bikri
         kisi aur ki hoti hai. POS par wo "kis ke naam" chun leta hai —
         wohi `soldById` me jata hai. Na chuna ho to jis ne bill banaya
         usi ki bikri mani jati hai. */
      const uid = sale.soldById ?? sale.createdById;
      if (sale.soldById && sale.soldById !== sale.createdById) reassignedBills += 1;
      if (!uid) {
        orphanBills += 1;
        orphanSale += num(sale.total);
        return;
      }
      const arr = byUser.get(uid) ?? [];
      arr.push(sale);
      byUser.set(uid, arr);
    });

    const userIds = new Set<string>([...byUser.keys(), ...enrolledIds]);
    const rows: any[] = [];

    for (const uid of userIds) {
      const bills = byUser.get(uid) ?? [];
      const enrolled = enrolledIds.has(uid);
      const name = bills.find((b) => b.soldById === uid)?.soldBy?.fullName
        ?? bills.find((b) => b.createdById === uid)?.createdBy?.fullName
        ?? (await this.nameOf(user.tenantId, uid))
        ?? 'Banda';

      /* Bande ki bikri bhi wapsi nikaal kar — warna jis ne becha aur
         agle din wapas aa gaya, us ki commission phir bhi banti rehti */
      const netted = bills.reduce(
        (acc, sl) => {
          const b = this.baseFor(sl, []);
          acc.sale += b.sale;
          acc.profit += b.profit;
          return acc;
        },
        { sale: 0, profit: 0 },
      );
      const sale = netted.sale;
      const profit = netted.profit;

      const own = rules.filter((r) => r.userId === uid);
      const common = rules.filter((r) => !r.userId);
      const mine = own.length > 0 ? own : common;

      const lines: Line[] = [];
      let earned = 0;
      let bonus = 0;
      let blockedByMin: { need: number; short: number } | undefined;
      let targetPct: number | undefined;

      if (enrolled) {
        for (const rule of mine) {
          if (rule.minMonthlySale && sale < rule.minMonthlySale) {
            blockedByMin = { need: rule.minMonthlySale, short: rule.minMonthlySale - sale };
            continue;
          }

          if (rule.basis === 'PER_BILL') {
            const amount = bills.length * rule.value;
            if (amount > 0) {
              lines.push({
                ruleId: rule.id, label: rule.name ?? 'Har bill par',
                base: bills.length, rate: rule.value,
                valueType: 'FIXED', amount,
              });
              earned += amount;
            }
          } else {
            const totals = bills.reduce(
              (acc, sl) => {
                const b = this.baseFor(sl, rule.categoryIds);
                acc.sale += b.sale;
                acc.profit += b.profit;
                acc.qty += b.qty;
                return acc;
              },
              { sale: 0, profit: 0, qty: 0 },
            );
            const base = rule.basis === 'PROFIT' ? totals.profit : totals.sale;
            /* Nuqsan par inaam nahi — munafa manfi ho to commission 0 */
            let amount = 0;
            if (rule.valueType === 'FIXED') {
              /* Fixed raqam: har bikri hui cheez par itne rupay */
              amount = totals.qty * rule.value;
            } else if (base > 0) {
              amount = (base * rule.value) / 100;
            }
            if (amount > 0) {
              lines.push({
                ruleId: rule.id,
                label: rule.name
                  ?? (rule.basis === 'PROFIT' ? 'Munafa par' : 'Bikri par'),
                base: rule.valueType === 'FIXED' ? totals.qty : base,
                rate: rule.value,
                valueType: rule.valueType,
                amount,
              });
              earned += amount;
            }
          }

          if (rule.targetAmount && rule.targetAmount > 0) {
            targetPct = Math.min((sale / rule.targetAmount) * 100, 999);
            if (sale >= rule.targetAmount && rule.targetBonus) {
              lines.push({
                ruleId: rule.id,
                label: `Target poora — ${rule.targetAmount}`,
                base: sale, rate: 0, valueType: 'FIXED', amount: rule.targetBonus,
              });
              earned += rule.targetBonus;
              bonus += rule.targetBonus;
            }
          }
        }
      }

      const payout = payoutByUser.get(uid);
      const st = staffByUser.get(uid);

      rows.push({
        userId: uid,
        name,
        enrolled,
        staff: st
          ? {
              id: st.id, staffNumber: st.staffNumber, designation: st.designation,
              salaryType: st.salaryType, baseSalary: num(st.baseSalary), status: st.status,
            }
          : null,
        /* Tankhwah + commission — banda yehi poochta hai ke "is mahine
           kitna milega". Sirf COMMISSION wale ki base 0 hoti hai. */
        baseSalary: st && st.salaryType !== 'COMMISSION' ? num(st.baseSalary) : 0,
        bills: bills.length,
        sale, profit,
        earned: Math.round(earned),
        bonus,
        blockedByMin: earned === 0 ? blockedByMin : undefined,
        targetPct,
        paid: !!payout,
        paidAt: payout?.paidAt ?? null,
        paidAmount: payout?.amount ?? null,
        lines,
        totalPay: (st && st.salaryType !== 'COMMISSION' ? num(st.baseSalary) : 0) + Math.round(earned),
        /* Tafseel sirf maangne par — poori list har dafa bhejna bhaari hai */
        ...(opts.detail ? this.detailFor(bills, mine, enrolled) : {}),
      });
    }

    rows.sort((a, b) =>
      Number(b.enrolled) - Number(a.enrolled) || b.earned - a.earned || b.sale - a.sale);

    const live = rows.filter((r) => r.enrolled);
    const total = live.reduce((a, r) => a + r.earned, 0);
    const paidTotal = live.filter((r) => r.paid).reduce((a, r) => a + r.earned, 0);

    return {
      period,
      timezone: tz,
      dayStartHour,
      from: from.toISOString(),
      to: to.toISOString(),
      rows,
      total,
      paidTotal,
      pendingTotal: total - paidTotal,
      enabledCount: live.length,
      notEnrolled: rows.filter((r) => !r.enrolled && r.bills > 0)
        .map((r) => ({ userId: r.userId, name: r.name, bills: r.bills, sale: r.sale })),
      partialReturnCount: sales.filter((s) => s.status === 'PARTIALLY_RETURNED').length,
      orphanBills,
      orphanSale,
      reassignedBills,
      baseTotal: live.reduce((a, r) => a + (r.baseSalary ?? 0), 0),
      payTotal: live.reduce((a, r) => a + (r.totalPay ?? 0), 0),
      ruleCount: rules.length,
    };
  }

  /** Ek bande ka poora khata — kaunsi cheez, kitne ki, kitni commission */
  async detail(user: AuthenticatedUser, userId: string, period: string) {
    const all = await this.summary(user, period, { detail: true });
    const row = all.rows.find((r: any) => r.userId === userId);
    if (!row) throw new NotFoundException('Is mahine is bande ka koi hisab nahi');
    return { period: all.period, timezone: all.timezone, ...row };
  }

  private async nameOf(tenantId: string, userId: string) {
    const u = await this.prisma.user.findFirst({
      where: { id: userId, tenantId }, select: { fullName: true },
    });
    return u?.fullName ?? null;
  }

  /**
   * Ek bill me se wo hissa jis par rule lagta hai.
   *
   * Hisab hamesha item ki satah par hota hai, bill ke `total` se nahi.
   * Wajah: jo maal wapas aa gaya us par commission nahi banni chahiye,
   * aur wapsi ki ginti (`returnedQty`) sirf item par milti hai. Is liye
   * aadhi wapsi wale bill bhi bilkul theek gine jate hain.
   */
  private baseFor(sale: any, categoryIds: string[]) {
    const cats = categoryIds ?? [];
    let s = 0, c = 0, qty = 0;
    (sale.items ?? []).forEach((it: any) => {
      if (cats.length > 0) {
        const cat = it.product?.categoryId;
        if (!cat || !cats.includes(cat)) return;
      }
      const net = Math.max(num(it.quantity) - num(it.returnedQty), 0);
      if (net <= 0) return;
      /* Line ka rate: `total` poori miqdar ka hai, is liye per-unit nikal
         kar bachi hui miqdar se guna karte hain (chhoot bhi isi me aa jati hai) */
      const perUnit = num(it.quantity) > 0
        ? num(it.total) / num(it.quantity)
        : num(it.price);
      s += perUnit * net;
      c += num(it.costPrice) * net;
      qty += net;
    });
    return { sale: s, profit: s - c, qty };
  }

  /**
   * "Commission kahan se aayi" ka jawab.
   *
   * Do nazariye: cheez ke hisab se (kaunsa maal kitna laaya) aur bill
   * ke hisab se (kis bill par kitni bani). Dono me har cheez ka rate
   * aur miqdar saath hai — dukaan-daar ko ginti dobara nahi karni parti.
   */
  private detailFor(bills: any[], rules: any[], enrolled: boolean) {
    const products = new Map<string, any>();
    bills.forEach((sale) => {
      (sale.items ?? []).forEach((it: any) => {
        const pid = it.product?.id ?? 'unknown';
        const e = products.get(pid) ?? {
          productId: pid,
          name: it.product?.name ?? 'Cheez',
          unit: it.product?.unit ?? '',
          categoryId: it.product?.categoryId ?? null,
          categoryName: it.product?.category?.name ?? null,
          qty: 0, sale: 0, cost: 0, returned: 0, bills: 0,
        };
        const net = Math.max(num(it.quantity) - num(it.returnedQty), 0);
        if (net <= 0) return;
        const perUnit = num(it.quantity) > 0 ? num(it.total) / num(it.quantity) : num(it.price);
        e.qty += net;
        e.sale += perUnit * net;
        e.cost += num(it.costPrice) * net;
        e.returned += num(it.returnedQty);
        e.bills += 1;
        products.set(pid, e);
      });
    });

    /* Har cheez par kitni commission bani — usi rule se jo us par
       lagta hai. Ye wohi hisab hai jo upar kul par chala, bas cheez
       ke hisse par. Is liye jor hamesha kul ke barabar rehta hai. */
    const withCommission = [...products.values()].map((p) => {
      let amount = 0;
      if (enrolled) {
        rules.forEach((rule: any) => {
          if (rule.basis === 'PER_BILL') return;
          const cats: string[] = rule.categoryIds ?? [];
          if (cats.length > 0 && (!p.categoryId || !cats.includes(p.categoryId))) return;
          if (rule.valueType === 'FIXED') {
            amount += p.qty * rule.value;
          } else {
            const base = rule.basis === 'PROFIT' ? p.sale - p.cost : p.sale;
            if (base > 0) amount += (base * rule.value) / 100;
          }
        });
      }
      return {
        ...p,
        profit: p.sale - p.cost,
        commission: Math.round(amount),
      };
    }).sort((a, b) => b.commission - a.commission || b.sale - a.sale);

    const byCategory = new Map<string, any>();
    withCommission.forEach((p) => {
      const key = p.categoryId ?? 'none';
      const e = byCategory.get(key) ?? {
        categoryId: p.categoryId, name: p.categoryName ?? 'Bina category',
        qty: 0, sale: 0, commission: 0, items: 0,
      };
      e.qty += p.qty; e.sale += p.sale; e.commission += p.commission; e.items += 1;
      byCategory.set(key, e);
    });

    return {
      byProduct: withCommission.slice(0, 100),
      byCategory: [...byCategory.values()].sort((a, b) => b.commission - a.commission),
      billList: bills.slice(0, 200).map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        soldAt: s.soldAt,
        status: s.status,
        customer: s.customer?.name ?? null,
        total: num(s.total),
        profit: num(s.total) - num(s.costOfGoods),
        discount: num(s.discount),
        items: (s.items ?? []).length,
      })),
    };
  }
}
