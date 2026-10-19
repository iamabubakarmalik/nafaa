/**
 * Monthly milk bills: a statement of one month's deliveries with the khata
 * balance before and after. Making the bill again for the same month brings
 * its figures up to date (deliveries added or undone since). The deliveries are already on the khata as
 * bills, so making a monthly bill books no money; payments go on the khata
 * and every bill's "still due" is worked out from it (settleBills). A rate
 * cut belongs on the delivery rate, not on the bill, so sales stay true.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { khataBalances, linkKhata, monthRange, nextNumbered, r2, r3, settleBills, shopYear, tzParts, withLiveBalance } from '../dairy-common';
import { BillPaymentDto, GenerateBillDto } from './dto/monthly-bill.dto';

@Injectable()
export class MonthlyBillsService {
  constructor(private readonly prisma: PrismaService) {}

  private period(monthIn: unknown, yearIn: unknown) {
    const month = Number(monthIn);
    const year = Number(yearIn);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Mahina aur saal sahi chunein');
    }
    const now = tzParts(new Date());
    if (year > now.year || (year === now.year && month > now.month)) throw new BadRequestException('Aane wale mahine ka bill nahi ban sakta');
    return { month, year };
  }

  async generateBill(user: AuthenticatedUser, dto: GenerateBillDto) {
    const customer = await this.prisma.dairyCustomer.findFirst({ where: { id: dto.dairyCustomerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const { month, year } = this.period(dto.month, dto.year);

    // A bill made before the month ended is brought up to date instead of failing.
    const existing = await this.prisma.dairyMonthlyBill.findFirst({ where: { tenantId: user.tenantId, dairyCustomerId: customer.id, month, year } });

    // Month edges on shop time, not server (UTC) time.
    const { start, end } = monthRange(year, month);
    const deliveries = await this.prisma.dairyDelivery.findMany({
      where: { tenantId: user.tenantId, dairyCustomerId: customer.id, status: 'DELIVERED', deliveryDate: { gte: start, lte: end } },
      select: { deliveredQty: true, totalAmount: true },
    });
    // An empty bill only clutters the list and the customer's WhatsApp.
    if (deliveries.length === 0) throw new BadRequestException(`${month}/${year} me ${customer.name} ki koi delivery nahi`);
    const totalAmount = r2(deliveries.reduce((s, d) => s + d.totalAmount, 0));

    // Balances at the month edges from the khata ledger when linked; else today's balance minus later deliveries.
    const ledgerAt = async (at: Date) => {
      if (!customer.customerId) return null;
      const row = await this.prisma.customerLedger.findFirst({
        where: { tenantId: user.tenantId, customerId: customer.customerId, createdAt: { lte: at } },
        orderBy: { createdAt: 'desc' }, select: { balanceAfter: true },
      });
      return row ? r2(Number(row.balanceAfter)) : 0;
    };
    const live = withLiveBalance(
      await this.prisma.dairyCustomer.findUniqueOrThrow({ where: { id: customer.id } }),
      await khataBalances(this.prisma, user.tenantId, [customer.customerId]),
    );
    const later = await this.prisma.dairyDelivery.aggregate({
      where: { tenantId: user.tenantId, dairyCustomerId: customer.id, status: 'DELIVERED', deliveryDate: { gt: end } },
      _sum: { totalAmount: true },
    });
    const closingBalance = (await ledgerAt(end)) ?? r2(live.currentBalance - (later._sum.totalAmount ?? 0));
    const openingBalance = (await ledgerAt(new Date(start.getTime() - 1))) ?? r2(closingBalance - totalAmount);
    const figures = {
      totalLiters: r3(deliveries.reduce((s, d) => s + d.deliveredQty, 0)),
      totalDeliveries: deliveries.length,
      totalAmount,
      openingBalance,
      closingBalance,
    };
    if (existing) {
      await this.prisma.dairyMonthlyBill.update({
        where: { id: existing.id },
        data: { ...figures, cycleStartDate: start, cycleEndDate: end, ...(dto.notes?.trim() && { notes: dto.notes.trim() }) },
      });
      await settleBills(this.prisma, user.tenantId, customer.id);
      return { ...(await this.prisma.dairyMonthlyBill.findUniqueOrThrow({ where: { id: existing.id } })), refreshed: true };
    }
    const prefix = `BILL-${shopYear()}-`;

    const bill = await nextNumbered(
      () => this.prisma.dairyMonthlyBill.count({ where: { tenantId: user.tenantId, billNumber: { startsWith: prefix } } }),
      prefix, 5,
      (billNumber) => this.prisma.dairyMonthlyBill.create({
        data: {
          tenantId: user.tenantId,
          dairyCustomerId: customer.id,
          billNumber,
          month,
          year,
          cycleStartDate: start,
          cycleEndDate: end,
          ...figures,
          discount: 0,
          paidAmount: 0,
          remainingAmount: totalAmount,
          notes: dto.notes?.trim() || null,
          handledById: user.id,
        },
      }),
    );
    await settleBills(this.prisma, user.tenantId, customer.id);
    return { ...(await this.prisma.dairyMonthlyBill.findUniqueOrThrow({ where: { id: bill.id } })), refreshed: false };
  }

  async generateBulkBills(user: AuthenticatedUser, monthIn: number, yearIn: number) {
    const { month, year } = this.period(monthIn, yearIn);
    const customers = await this.prisma.dairyCustomer.findMany({ where: { tenantId: user.tenantId, status: { not: 'CLOSED' } }, select: { id: true, name: true } });
    const results: Array<{ customerId: string; name: string; billNumber?: string; status: 'success' | 'updated' | 'skipped'; reason?: string }> = [];
    for (const c of customers) {
      try {
        const bill = await this.generateBill(user, { dairyCustomerId: c.id, month, year });
        results.push({ customerId: c.id, name: c.name, billNumber: bill.billNumber, status: bill.refreshed ? 'updated' : 'success' });
      } catch (e) {
        results.push({ customerId: c.id, name: c.name, status: 'skipped', reason: (e as Error).message });
      }
    }
    return {
      total: customers.length,
      generated: results.filter((r) => r.status === 'success').length,
      updated: results.filter((r) => r.status === 'updated').length,
      results,
    };
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; month?: number; year?: number; isPaid?: boolean; search?: string }) {
    const search = params.search?.trim();
    const customers = search
      ? await this.prisma.dairyCustomer.findMany({
        where: { tenantId: user.tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { customerNumber: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] },
        select: { id: true },
      })
      : null;
    const where = {
      tenantId: user.tenantId,
      ...(params.customerId && { dairyCustomerId: params.customerId }),
      ...(customers && { OR: [{ dairyCustomerId: { in: customers.map((c) => c.id) } }, { billNumber: { contains: search!, mode: 'insensitive' as const } }] }),
      ...(Number.isInteger(params.month) && { month: params.month }),
      ...(Number.isInteger(params.year) && { year: params.year }),
    };
    // Bring "still due" up to date with the khata before showing it.
    const owners = await this.prisma.dairyMonthlyBill.findMany({ where: { ...where, isPaid: false }, select: { dairyCustomerId: true }, distinct: ['dairyCustomerId'], take: 300 });
    for (const o of owners) await settleBills(this.prisma, user.tenantId, o.dairyCustomerId);

    const bills = await this.prisma.dairyMonthlyBill.findMany({
      where: { ...where, ...(params.isPaid !== undefined && { isPaid: params.isPaid }) },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { billNumber: 'desc' }],
      take: 500,
    });
    const people = await this.prisma.dairyCustomer.findMany({
      where: { id: { in: [...new Set(bills.map((b) => b.dairyCustomerId))] } },
      select: { id: true, name: true, phone: true, customerNumber: true, address: true, customerId: true, route: { select: { name: true } } },
    });
    const byId = new Map(people.map((p) => [p.id, p]));
    return bills.map((b) => ({ ...b, customer: byId.get(b.dairyCustomerId) ?? null }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const found = await this.prisma.dairyMonthlyBill.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!found) throw new NotFoundException('Bill nahi mila');
    await settleBills(this.prisma, user.tenantId, found.dairyCustomerId);
    const b = await this.prisma.dairyMonthlyBill.findUniqueOrThrow({ where: { id } });
    const customer = await this.prisma.dairyCustomer.findUnique({ where: { id: b.dairyCustomerId }, include: { route: { select: { name: true } } } });
    const deliveries = await this.prisma.dairyDelivery.findMany({
      where: { tenantId: user.tenantId, dairyCustomerId: b.dairyCustomerId, status: { in: ['DELIVERED', 'SKIPPED'] }, deliveryDate: { gte: b.cycleStartDate, lte: b.cycleEndDate } },
      orderBy: [{ deliveryDate: 'asc' }, { slot: 'asc' }],
    });
    return { ...b, customer, deliveries };
  }

  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: BillPaymentDto) {
    const found = await this.prisma.dairyMonthlyBill.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!found) throw new NotFoundException('Bill nahi mila');
    await settleBills(this.prisma, user.tenantId, found.dairyCustomerId);
    const b = await this.prisma.dairyMonthlyBill.findUniqueOrThrow({ where: { id } });
    const amount = r2(Number(dto?.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount sahi likhein');
    if (amount > b.remainingAmount + 0.01) {
      throw new BadRequestException(`Is bill par sirf Rs ${Math.round(b.remainingAmount)} baqi hain — zyada amount customer ke khate me "Payment" se lein`);
    }

    const c = await this.prisma.dairyCustomer.findUniqueOrThrow({ where: { id: b.dairyCustomerId }, include: { route: { select: { shopId: true } } } });
    await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, c.route?.shopId ?? scope.shopId);
      const customerId = await linkKhata(tx, user, c.id, shopId);
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, method: dto.paymentMethod,
        reference: dto.reference?.trim() || b.billNumber, note: `Doodh bill ${b.billNumber} (${b.month}/${b.year})`,
      });
      await tx.dairyCustomer.update({ where: { id: c.id }, data: { currentBalance: { decrement: amount }, totalPayments: { increment: amount }, lastPaymentDate: new Date() } });
      await tx.dairyMonthlyBill.update({ where: { id }, data: { paymentMethod: dto.paymentMethod ?? null, paymentReference: dto.reference?.trim() || null } });
      await settleBills(tx, user.tenantId, c.id);
    });
    return this.prisma.dairyMonthlyBill.findUniqueOrThrow({ where: { id } });
  }

  async markSent(user: AuthenticatedUser, id: string, printed?: boolean) {
    const b = await this.prisma.dairyMonthlyBill.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!b) throw new NotFoundException('Bill nahi mila');
    return this.prisma.dairyMonthlyBill.update({
      where: { id },
      data: printed ? { isPrinted: true } : { sentToCustomer: true, sentAt: new Date() },
    });
  }
}
