import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import {
  AddUdhaarDto,
  CreatePaymentDto,
  OpeningBalanceDto,
} from './dto/create-payment.dto';

/**
 * ════════════════════════════════════════════════════════════════
 * KHATA ACROSS BRANCHES
 * ════════════════════════════════════════════════════════════════
 *
 * One customer record is shared by every branch — the same person walks into
 * any of them and is recognised. What differs is *where* each entry happened:
 * every CustomerLedger row carries the branch that raised it.
 *
 *   Customer.balance   → what the customer owes the business in total.
 *   branch balance     → SUM(CustomerLedger.amount) for that branch.
 *
 * So a customer can take udhaar at Shop A and pay it back at Shop B: the total
 * settles correctly, and each branch still sees what it personally is owed.
 */
@Injectable()
export class CustomerLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** What this customer owes *at one branch*. */
  private async branchBalance(
    client: any,
    tenantId: string,
    customerId: string,
    shopId: string,
  ): Promise<number> {
    const agg = await client.customerLedger.aggregate({
      where: { tenantId, customerId, shopId },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  async list(user: AuthenticatedUser, scope: ShopScope, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const ledgers = await this.prisma.customerLedger.findMany({
      where: { customerId, tenantId: user.tenantId, ...scope.where },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        shop: { select: { id: true, name: true, isMain: true } },
      },
      take: 100,
    });

    // On a single branch, show that branch's share next to the overall total.
    const shopBalance = scope.shopId
      ? await this.branchBalance(
          this.prisma,
          user.tenantId,
          customerId,
          scope.shopId,
        )
      : customer.balance;

    return {
      customer,
      ledgers,
      /** Owed at the branch currently being viewed. */
      shopBalance,
      /** Owed across every branch. */
      totalBalance: customer.balance,
      isAllShops: scope.isAll,
    };
  }

  async receivePayment(
    user: AuthenticatedUser,
    scope: ShopScope,
    customerId: string,
    dto: CreatePaymentDto,
  ) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    if (customer.balance <= 0) {
      throw new BadRequestException('Customer ka koi balance nahi hai');
    }

    // Checked against the overall balance on purpose: a customer may settle at
    // any branch, not only the one that gave the credit.
    if (dto.amount > customer.balance) {
      throw new BadRequestException(
        `Customer ka balance sirf ${customer.balance} hai`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const newBalance = customer.balance - dto.amount;

      const updated = await tx.customer.update({
        where: { id: customer.id },
        data: { balance: newBalance },
      });

      const ledger = await tx.customerLedger.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          customerId: customer.id,
          createdById: user.id,
          type: 'PAYMENT_RECEIVED',
          amount: -dto.amount,
          balanceAfter: newBalance,
          reference: dto.reference,
          note: dto.note || 'Payment received',
        },
      });

      return { customer: updated, ledger };
    });
  }

  /**
   * Bina sale ke udhaar chadhana. Frontend pehle se is endpoint ko
   * call kar raha tha lekin backend me tha hi nahi — 404 aata tha.
   */
  async addUdhaar(
    user: AuthenticatedUser,
    scope: ShopScope,
    customerId: string,
    dto: AddUdhaarDto,
  ) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.$transaction(async (tx) => {
      const newBalance = customer.balance + dto.amount;

      const updated = await tx.customer.update({
        where: { id: customer.id },
        data: { balance: newBalance },
      });

      const ledger = await tx.customerLedger.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          customerId: customer.id,
          createdById: user.id,
          type: 'ADJUSTMENT',
          amount: dto.amount,
          balanceAfter: newBalance,
          reference: dto.reference,
          note: dto.note || 'Udhaar (bina sale ke)',
        },
      });

      return { customer: updated, ledger };
    });
  }

  /**
   * Purana khata shuru karna — is branch ka balance SET hota hai, jurta nahi.
   * Har branch apna purana hisab alag shuru kar sakti hai; customer ka kul
   * balance usi farq se aage barhta hai.
   */
  async setOpeningBalance(
    user: AuthenticatedUser,
    scope: ShopScope,
    customerId: string,
    dto: OpeningBalanceDto,
  ) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const already = await this.prisma.customerLedger.findFirst({
      where: {
        customerId,
        tenantId: user.tenantId,
        shopId,
        type: 'OPENING_BALANCE',
      },
    });
    if (already) {
      throw new BadRequestException(
        'Is customer ka purana khata is shop mein pehle hi shuru ho chuka hai — ab "Udhaar Chadhayein" use karein',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Only this branch's share is being restated; the rest of the customer's
      // history at other branches stays exactly as it was.
      const currentBranch = await this.branchBalance(
        tx,
        user.tenantId,
        customerId,
        shopId,
      );
      const delta = dto.balance - currentBranch;
      const newBalance = customer.balance + delta;

      const updated = await tx.customer.update({
        where: { id: customer.id },
        data: { balance: newBalance },
      });

      const ledger = await tx.customerLedger.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          customerId: customer.id,
          createdById: user.id,
          type: 'OPENING_BALANCE',
          // Jo farq para wohi ledger me — taake hisab chalta rahe
          amount: delta,
          balanceAfter: newBalance,
          note: dto.note || 'Purana khata (copy se shuru)',
        },
      });

      return { customer: updated, ledger };
    });
  }

  async summary(user: AuthenticatedUser, scope: ShopScope) {
    const tenantId = user.tenantId;
    const shopWhere = scope.where;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [debtors, agg, advanceAgg, monthLedgers, recent] = await Promise.all([
      this.debtors(tenantId, scope),
      this.prisma.customer.aggregate({
        where: { tenantId },
        _sum: { balance: true },
        _count: { _all: true },
      }),
      this.advance(tenantId, scope),
      this.prisma.customerLedger.findMany({
        where: { tenantId, ...shopWhere, createdAt: { gte: monthStart } },
        select: { type: true, amount: true },
      }),
      this.prisma.customerLedger.findMany({
        where: { tenantId, ...shopWhere },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, fullName: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);

    let monthUdhaar = 0;
    let monthWasooli = 0;
    for (const l of monthLedgers) {
      if (l.amount > 0) monthUdhaar += l.amount;
      else monthWasooli += Math.abs(l.amount);
    }

    // Kitne din se koi wasooli nahi hui — sab se purane pehle
    const now = Date.now();
    const stale = debtors
      .map((d) => ({
        ...d,
        daysSinceActivity: Math.floor(
          (now - new Date(d.updatedAt).getTime()) / 86_400_000,
        ),
      }))
      .filter((d) => d.daysSinceActivity >= 30)
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

    const overLimit = debtors.filter(
      (d) => d.creditLimit > 0 && d.balance > d.creditLimit,
    );

    return {
      totalOutstanding: debtors.reduce((s, d) => s + d.balance, 0),
      totalCustomers: agg._count._all,
      customersWithCredit: debtors.length,
      /** Jin customers ne advance de rakha hai */
      advance: advanceAgg,
      thisMonth: { udhaar: monthUdhaar, wasooli: monthWasooli },
      overLimitCount: overLimit.length,
      staleCount: stale.length,
      /** 30+ din se khamosh — inhe yaad dilana chahiye */
      staleDebtors: stale.slice(0, 20),
      topDebtors: debtors,
      recentActivity: recent,
      isAllShops: scope.isAll,
    };
  }

  // ════════════════════════════════════════════════════════════
  // Debtor lists — tenant-wide reads `Customer.balance` directly;
  // a single branch has to add up that branch's ledger instead.
  // ════════════════════════════════════════════════════════════

  private readonly debtorFields = {
    id: true,
    name: true,
    phone: true,
    balance: true,
    creditLimit: true,
    totalSpent: true,
    isVip: true,
    updatedAt: true,
  } as const;

  private async debtors(tenantId: string, scope: ShopScope) {
    if (!scope.shopId) {
      return this.prisma.customer.findMany({
        where: { tenantId, balance: { gt: 0 } },
        orderBy: { balance: 'desc' },
        select: this.debtorFields,
        take: 1000,
      });
    }

    const grouped = await this.prisma.customerLedger.groupBy({
      by: ['customerId'],
      where: { tenantId, shopId: scope.shopId },
      _sum: { amount: true },
    });

    const owing = grouped
      .map((g) => ({ customerId: g.customerId, balance: Number(g._sum.amount ?? 0) }))
      .filter((g) => g.balance > 0.0001)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 1000);

    return this.hydrate(tenantId, owing);
  }

  private async advance(tenantId: string, scope: ShopScope) {
    if (!scope.shopId) {
      const agg = await this.prisma.customer.aggregate({
        where: { tenantId, balance: { lt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      });
      return {
        amount: Math.abs(agg._sum.balance ?? 0),
        count: agg._count._all,
      };
    }

    const grouped = await this.prisma.customerLedger.groupBy({
      by: ['customerId'],
      where: { tenantId, shopId: scope.shopId },
      _sum: { amount: true },
    });
    const credits = grouped
      .map((g) => Number(g._sum.amount ?? 0))
      .filter((v) => v < -0.0001);

    return {
      amount: Math.abs(credits.reduce((s, v) => s + v, 0)),
      count: credits.length,
    };
  }

  /** Attach customer details to branch-computed balances, keeping the order. */
  private async hydrate(
    tenantId: string,
    rows: Array<{ customerId: string; balance: number }>,
  ) {
    if (rows.length === 0) return [];

    const customers = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: rows.map((r) => r.customerId) } },
      select: this.debtorFields,
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    return rows
      .map((r) => {
        const c = byId.get(r.customerId);
        if (!c) return null;
        // `balance` is this branch's share; the overall figure stays available.
        return { ...c, balance: r.balance, totalBalance: c.balance };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }
}
