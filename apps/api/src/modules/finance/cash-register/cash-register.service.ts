import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CashTransactionDto } from './dto/cash-transaction.dto';

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register khulne se ab tak golak me jo kuch aaya aur gaya.
   *
   * Ye hisab `getCurrent()` aur `close()` DONO istemal karte hain.
   * Pehle dono ke apne apne query thay aur wo aapas me alag ho gaye
   * — kharch par `shopId` ka filter sirf ek jagah laga tha. Ab ek
   * hi jagah, to dobara aisa nahi hoga.
   */
  private async computeLiveCash(tenantId: string, register: {
    shopId: string | null;
    openedAt: Date;
    openingBalance: number;
    totalCashIn: number;
    totalCashOut: number;
  }) {
    const since = register.openedAt;
    const shopWhere = register.shopId ? { shopId: register.shopId } : {};

    const [
      cashSales, allSales, cashExpenses, cashReturns,
      cashPurchases, supplierPayments,
    ] = await Promise.all([
      // ─── AANA ─────────────────────────────────────────────
      /** Cash wali bikri — yehi golak me aati hai */
      this.prisma.sale.aggregate({
        where: {
          tenantId, ...shopWhere,
          status: { not: 'VOIDED' },
          paymentMethod: 'CASH',
          soldAt: { gte: since },
        },
        _sum: { paidAmount: true },
        _count: { _all: true },
      }),

      /** Saari bikri — cash ke ilawa bhi, taake poori tasveer bane */
      this.prisma.sale.aggregate({
        where: {
          tenantId, ...shopWhere,
          status: { not: 'VOIDED' },
          soldAt: { gte: since },
        },
        _sum: { total: true, paidAmount: true, creditAmount: true },
        _count: { _all: true },
      }),

      // ─── JAANA ────────────────────────────────────────────
      /* Kharch — SIRF isi dukaan ka. Pehle `shopId` ka koi filter
         nahi tha: do dukaanon wale tenant me doosri dukaan ka
         kharch bhi isi golak se ghata diya jata tha. */
      this.prisma.expense.aggregate({
        where: {
          tenantId, ...shopWhere,
          paymentMethod: 'CASH',
          status: 'PAID',
          expenseDate: { gte: since },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      /** Wapsi — cash wapas kiya to golak se nikla */
      this.prisma.saleReturn.aggregate({
        where: {
          tenantId,
          refundMethod: 'CASH',
          returnedAt: { gte: since },
          sale: { ...shopWhere },
        },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),

      /* Kharidari jis ka paisa mauqe par cash diya gaya.
         `paidAmount` hi ginte hain, `total` nahi — udhaar par liya
         hua maal golak se paisa nahi nikalta. */
      this.prisma.purchase.aggregate({
        where: {
          tenantId, ...shopWhere,
          paymentMethod: 'CASH',
          status: { not: 'CANCELLED' },
          purchasedAt: { gte: since },
        },
        _sum: { paidAmount: true },
        _count: { _all: true },
      }),

      /* Supplier ko baad me di gayi adaigi (khate se).
         Sirf CASH wali — bank ya cheque se di gayi raqam golak se
         nahi nikalti. NULL bhi cash ginte hain: us column se pehle
         ki entriyon par kuch likha hi nahi gaya tha. */
      this.prisma.supplierLedger.aggregate({
        where: {
          tenantId,
          type: 'PAYMENT_MADE',
          entryDate: { gte: since },
          OR: [{ paymentMethod: 'CASH' }, { paymentMethod: null }],
          ...(register.shopId
            ? { AND: [{ OR: [{ shopId: register.shopId }, { shopId: null }] }] }
            : {}),
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const n = (v: unknown) => Number(v ?? 0);

    const cashSalesTotal = n(cashSales._sum.paidAmount);
    const expensesTotal = n(cashExpenses._sum.amount);
    const returnsTotal = n(cashReturns._sum?.refundAmount);
    const purchasesTotal = n(cashPurchases._sum.paidAmount);
    const supplierPaidTotal = n(supplierPayments._sum.amount);

    const openingBalance = n(register.openingBalance);
    const cashIn = n(register.totalCashIn);
    const cashOut = n(register.totalCashOut);

    const expected =
      openingBalance +
      cashSalesTotal +
      cashIn -
      cashOut -
      expensesTotal -
      returnsTotal -
      purchasesTotal -
      supplierPaidTotal;

    return {
      openingBalance,
      cashSales: cashSalesTotal,
      cashSalesCount: cashSales._count._all ?? 0,
      cashIn,
      cashOut,
      expenses: expensesTotal,
      expenseCount: cashExpenses._count._all ?? 0,
      returns: returnsTotal,
      returnCount: cashReturns._count._all ?? 0,
      purchases: purchasesTotal,
      purchaseCount: cashPurchases._count._all ?? 0,
      supplierPaid: supplierPaidTotal,
      supplierPaidCount: supplierPayments._count._all ?? 0,
      expected,

      /** Golak ke bahar ka paisa — card, wallet, udhaar */
      allSalesTotal: n(allSales._sum.total),
      allSalesPaid: n(allSales._sum.paidAmount),
      creditGiven: n(allSales._sum.creditAmount),
      billCount: allSales._count._all ?? 0,
      nonCashCollected: n(allSales._sum.paidAmount) - cashSalesTotal,

      openedAt: register.openedAt,
      /** Register kitni der se khula hai (ghante) */
      openHours: (Date.now() - new Date(register.openedAt).getTime()) / 3_600_000,
    };
  }

  /**
   * Khula hua register — poore live hisab ke sath.
   *
   * Pehle yahan sirf database ki row wapas ki jati thi. Us ka
   * `expectedBalance` sirf HAATH SE ki gayi cash in/out par badalta
   * hai — bikri par nahi. Bikri ka hisab sirf band karte waqt lagta
   * tha.
   *
   * Nateeja: dukaan-daar din bhar ghalat "mutawaqqa" raqam dekhta
   * tha. Subah 5,000 se register khola, din bhar 40,000 ki cash
   * bikri hui — aur screen phir bhi 5,000 dikhati rehti.
   */
  async getCurrent(user: AuthenticatedUser, scope: ShopScope) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN', ...scope.where },
      include: {
        openedBy: { select: { id: true, fullName: true } },
        shop: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { createdBy: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!register) return null;

    const live = await this.computeLiveCash(user.tenantId, register);

    return {
      ...register,
      /** LIVE — database wale purane number ki jagah */
      expectedBalance: live.expected,
      live,
    };
  }

  async open(user: AuthenticatedUser, scope: ShopScope, dto: OpenRegisterDto) {
    const shopId = await resolveWriteShopId(
      this.prisma,
      user.tenantId,
      scope,
      dto.shopId,
    );

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId: user.tenantId, isActive: true },
    });
    if (!shop) throw new NotFoundException('Shop not found or inactive');

    // Check if this shop already has an open register
    const existing = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, shopId, status: 'OPEN' },
    });
    if (existing) {
      throw new BadRequestException(
        `${shop.name} ka register pehle se open hai. Pehle close karein.`,
      );
    }

    const registerNumber = `CR-${shop.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          openedById: user.id,
          registerNumber,
          openingBalance: dto.openingBalance,
          expectedBalance: dto.openingBalance,
          notes: dto.notes,
          status: 'OPEN',
        },
      });

      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: 'OPENING',
          amount: dto.openingBalance,
          reason: `${shop.name} register opened`,
          note: dto.notes,
        },
      });

      return register;
    });
  }

  async addTransaction(
    user: AuthenticatedUser,
    scope: ShopScope,
    dto: CashTransactionDto,
  ) {
    const register = await this.prisma.cashRegister.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'OPEN',
        ...scope.where,
      },
    });
    if (!register) throw new BadRequestException('Koi register open nahi hai');

    return this.prisma.$transaction(async (tx) => {
      const change = dto.type === 'CASH_IN' ? dto.amount : -dto.amount;
      const newExpected = register.expectedBalance + change;

      await tx.cashRegister.update({
        where: { id: register.id },
        data: {
          expectedBalance: newExpected,
          totalCashIn: { increment: dto.type === 'CASH_IN' ? dto.amount : 0 },
          totalCashOut: { increment: dto.type === 'CASH_OUT' ? dto.amount : 0 },
        },
      });

      return tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: dto.type,
          amount: dto.amount,
          reason: dto.reason,
          note: dto.note,
        },
      });
    });
  }

  async close(user: AuthenticatedUser, scope: ShopScope, dto: CloseRegisterDto) {
    const register = await this.prisma.cashRegister.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'OPEN',
        ...scope.where,
      },
    });
    if (!register) throw new BadRequestException('Koi register open nahi hai');

    /* Band karte waqt wohi hisab jo din bhar screen par chalta
       raha — ek hi jagah se. Pehle yahan apne alag query thay aur
       dono taraf ka hisab chup-chaap alag ho gaya tha. */
    const live = await this.computeLiveCash(user.tenantId, register as any);

    const totalCashSales = live.cashSales;
    const totalCashExpenses = live.expenses;
    const expectedFinal = live.expected;

    const difference = dto.closingBalance - expectedFinal;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cashRegister.update({
        where: { id: register.id },
        data: {
          status: 'CLOSED',
          closedById: user.id,
          closingBalance: dto.closingBalance,
          expectedBalance: expectedFinal,
          difference,
          totalSales: totalCashSales,
          totalExpenses: totalCashExpenses,
          closedAt: new Date(),
          notes: dto.notes ?? register.notes,
        },
      });

      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: 'CLOSING',
          amount: dto.closingBalance,
          reason: 'Register closed',
          note:
            `Difference: ${difference} | opening ${live.openingBalance}` +
            ` + bikri ${live.cashSales} + daala ${live.cashIn}` +
            ` − nikala ${live.cashOut} − kharch ${live.expenses}` +
            ` − wapsi ${live.returns} − kharidari ${live.purchases}` +
            ` − supplier ${live.supplierPaid}`,
        },
      });

      return updated;
    });
  }

  async history(user: AuthenticatedUser, scope: ShopScope) {
    return this.prisma.cashRegister.findMany({
      where: { tenantId: user.tenantId, ...scope.where },
      orderBy: { openedAt: 'desc' },
      take: 30,
      include: {
        openedBy: { select: { id: true, fullName: true } },
        closedBy: { select: { id: true, fullName: true } },
        shop: true,
      },
    });
  }
}
