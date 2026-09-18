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
   * Khula hua register — poore live hisab ke sath.
   *
   * Pehle yahan sirf database ki row wapas ki jati thi. Us ka
   * `expectedBalance` sirf HAATH SE ki gayi cash in/out par badalta
   * hai — bikri par nahi. Bikri ka hisab sirf band karte waqt lagta
   * tha.
   *
   * Nateeja: dukaan-daar din bhar ghalat "mutawaqqa" raqam dekhta
   * tha. Subah 5,000 se register khola, din bhar 40,000 ki cash
   * bikri hui — aur screen phir bhi 5,000 dikhati rehti. Golak
   * ginne ka koi faida hi nahi hota tha.
   *
   * Ab hisab LIVE hai: opening + cash bikri + haath se daala −
   * haath se nikala − cash kharch − cash wapsi.
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

    const since = register.openedAt;
    const shopWhere = register.shopId ? { shopId: register.shopId } : {};

    const [cashSales, allSales, cashExpenses, cashReturns] = await Promise.all([
      // Cash wali bikri — yehi golak me aati hai
      this.prisma.sale.aggregate({
        where: {
          tenantId: user.tenantId, ...shopWhere,
          status: { not: 'VOIDED' },
          paymentMethod: 'CASH',
          soldAt: { gte: since },
        },
        _sum: { paidAmount: true },
        _count: { _all: true },
      }),

      // Saari bikri — cash ke ilawa bhi, taake poori tasveer bane
      this.prisma.sale.aggregate({
        where: {
          tenantId: user.tenantId, ...shopWhere,
          status: { not: 'VOIDED' },
          soldAt: { gte: since },
        },
        _sum: { total: true, paidAmount: true, creditAmount: true },
        _count: { _all: true },
      }),

      /* Kharch — SIRF isi dukaan ka.
         Pehle `shopId` ka koi filter nahi tha: do dukaanon wale
         tenant me doosri dukaan ka kharch bhi isi golak se ghata
         diya jata tha aur har raat hisab kam nikalta tha. */
      this.prisma.expense.aggregate({
        where: {
          tenantId: user.tenantId, ...shopWhere,
          paymentMethod: 'CASH',
          status: 'PAID',
          expenseDate: { gte: since },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Wapsi — cash wapas kiya to golak se nikla
      this.prisma.saleReturn.aggregate({
        where: {
          tenantId: user.tenantId,
          refundMethod: 'CASH',
          returnedAt: { gte: since },
          sale: { ...shopWhere },
        },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
    ]);

    const cashSalesTotal = Number(cashSales._sum.paidAmount ?? 0);
    const expensesTotal = Number(cashExpenses._sum.amount ?? 0);
    const returnsTotal = Number(cashReturns._sum?.refundAmount ?? 0);

    const expected =
      Number(register.openingBalance) +
      cashSalesTotal +
      Number(register.totalCashIn) -
      Number(register.totalCashOut) -
      expensesTotal -
      returnsTotal;

    return {
      ...register,
      /** LIVE — database wale purane number ki jagah */
      expectedBalance: expected,

      live: {
        openingBalance: Number(register.openingBalance),
        cashSales: cashSalesTotal,
        cashSalesCount: cashSales._count._all ?? 0,
        cashIn: Number(register.totalCashIn),
        cashOut: Number(register.totalCashOut),
        expenses: expensesTotal,
        expenseCount: cashExpenses._count._all ?? 0,
        returns: returnsTotal,
        returnCount: cashReturns._count._all ?? 0,
        expected,

        /** Golak ke bahar ka paisa — card, wallet, udhaar */
        allSalesTotal: Number(allSales._sum.total ?? 0),
        allSalesPaid: Number(allSales._sum.paidAmount ?? 0),
        creditGiven: Number(allSales._sum.creditAmount ?? 0),
        billCount: allSales._count._all ?? 0,
        nonCashCollected: Number(allSales._sum.paidAmount ?? 0) - cashSalesTotal,

        openedAt: register.openedAt,
        /** Register kitni der se khula hai (ghante) */
        openHours: (Date.now() - new Date(register.openedAt).getTime()) / 3_600_000,
      },
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

    // Cash sales for THIS shop during this register session
    const cashSales = await this.prisma.sale.aggregate({
      where: {
        tenantId: user.tenantId,
        shopId: register.shopId,
        status: { not: 'VOIDED' },
        paymentMethod: 'CASH',
        soldAt: { gte: register.openedAt },
      },
      _sum: { paidAmount: true },
    });
    const totalCashSales = cashSales._sum.paidAmount ?? 0;

    /* Kharch sirf isi dukaan ka — pehle shopId ka filter nahi tha
       aur doosri dukaan ka kharch bhi is golak se ghata diya jata. */
    const cashExpenses = await this.prisma.expense.aggregate({
      where: {
        tenantId: user.tenantId,
        ...(register.shopId ? { shopId: register.shopId } : {}),
        paymentMethod: 'CASH',
        status: 'PAID',
        expenseDate: { gte: register.openedAt },
      },
      _sum: { amount: true },
    });

    /* Cash wapsi bhi golak se nikalti hai — pehle ginti hi nahi jati
       thi, is liye raat ko hisab hamesha zyada nikalta tha. */
    const cashReturns = await this.prisma.saleReturn.aggregate({
      where: {
        tenantId: user.tenantId,
        refundMethod: 'CASH',
        returnedAt: { gte: register.openedAt },
        sale: register.shopId ? { shopId: register.shopId } : {},
      },
      _sum: { refundAmount: true },
    });
    const totalCashReturns = Number(cashReturns._sum?.refundAmount ?? 0);
    const totalCashExpenses = cashExpenses._sum.amount ?? 0;

    const expectedFinal =
      register.openingBalance + totalCashSales + register.totalCashIn -
      register.totalCashOut - totalCashExpenses - totalCashReturns;

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
          note: `Difference: ${difference}`,
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
