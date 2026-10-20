import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, applyStockDelta } from '../../../common/shop-scope';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { addDaysTz, dayKey, dayStart, drawerCash, parseDay } from '../bookstore-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Blank form fields arrive as ''; a blank id is "none", never a link. */
const blank = (v?: string | null) => (v && String(v).trim() ? v : undefined);

/**
 * Book rentals.
 *
 * Issuing takes the copy out of stock, bills the rental fee and puts the
 * deposit in the drawer. Returning brings the copy back, bills any late
 * fine and hands the deposit back; a lost copy is billed at its price.
 * Before, a rental only wrote a row: stock said the book was on the shelf,
 * and neither the fee, the fine nor the deposit reached the drawer or any
 * report.
 *
 * Rentals issued before this change have no stock or deposit entry; they
 * are closed without moving stock or cash, so old numbers are not doubled.
 */
@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: any) {
    const productId = blank(dto.productId);
    if (!productId) throw new BadRequestException('Kitab chunein');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true, name: true, costPrice: true },
    });
    if (!product) throw new NotFoundException('Kitab nahi mili');
    const customerId = blank(dto.customerId);
    if (customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
    }
    if (!customerId && !String(dto.customerName ?? '').trim()) throw new BadRequestException('Customer chunein ya naam likhein');
    const quantity = Math.max(Math.floor(Number(dto.quantity) || 1), 1);
    const rentalPrice = r2(Math.max(Number(dto.rentalPrice) || 0, 0));
    const depositAmount = r2(Math.max(Number(dto.depositAmount) || 0, 0));
    const days = Math.max(Math.floor(Number(dto.rentalDays) || 14), 1);
    const dueDate = parseDay(dto.dueDate) ?? addDaysTz(dayStart(), days);

    const count = await this.prisma.bookRental.count({ where: { tenantId: user.tenantId } });
    const year = dayKey().slice(0, 4);
    let n = count + 1;
    let rentalNumber = `RENT-${year}-${String(n).padStart(4, '0')}`;
    while (await this.prisma.bookRental.findFirst({ where: { tenantId: user.tenantId, rentalNumber }, select: { id: true } })) {
      n += 1;
      rentalNumber = `RENT-${year}-${String(n).padStart(4, '0')}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope.shopId ?? blank(dto.shopId));
      const rental = await tx.bookRental.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          rentalNumber,
          customerId,
          productId,
          variantId: blank(dto.variantId),
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerCnic: dto.customerCnic,
          quantity,
          rentalPrice,
          depositAmount,
          dueDate,
          finePerDay: Number(dto.finePerDay) >= 0 ? Number(dto.finePerDay) : 50,
          conditionOnIssue: dto.conditionOnIssue,
          notes: dto.notes,
          issuedById: user.id,
        },
      });

      // The copy leaves the shelf. Not a sale and not a loss, so no write-off.
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId, delta: -quantity,
        movementType: 'ADJUSTMENT_OUT', reference: rentalNumber, note: 'Kiraye par di gayi', userId: user.id,
        preventNegative: true, label: product.name,
      });

      if (rentalPrice > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: `BKR-${rentalNumber}`,
          sourceRef: rentalNumber,
          shopId,
          customerId,
          lines: [{ label: `Kitab kiraya: ${product.name}${quantity > 1 ? ` x${quantity}` : ''} (${rentalNumber})`, amount: rentalPrice }],
          paidAmount: rentalPrice,
          paymentMethod: dto.paymentMethod ?? 'CASH',
        });
      }
      if (depositAmount > 0) {
        await drawerCash(tx, user, {
          direction: 'IN', amount: depositAmount, shopId, reference: rentalNumber,
          reason: `Kitab ka deposit: ${dto.customerName || 'customer'} (${rentalNumber})`,
        });
      }
      return rental;
    });
  }

  async list(user: AuthenticatedUser, params: any) {
    return this.prisma.bookRental.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.overdue && { status: { in: ['ACTIVE', 'OVERDUE'] }, dueDate: { lt: dayStart() } }),
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    });
  }

  /** Whether this rental's issue moved stock (rentals before that change did not). */
  private async issuedWithStock(tx: any, tenantId: string, rentalNumber: string) {
    const m = await tx.stockMovement.findFirst({
      where: { tenantId, reference: rentalNumber, type: 'ADJUSTMENT_OUT' },
      select: { id: true },
    });
    return !!m;
  }

  /** Deposit put in a drawer at issue (0 when it was not recorded there). */
  private async depositInDrawer(tx: any, tenantId: string, rentalNumber: string): Promise<number> {
    const agg = await tx.cashTransaction.aggregate({
      where: { tenantId, reference: rentalNumber, type: 'CASH_IN' },
      _sum: { amount: true },
    });
    return r2(agg._sum.amount ?? 0);
  }

  /** Whole shop days late (0 when on time). */
  private daysLate(dueDate: Date): number {
    const [y1, m1, d1] = dayKey(dueDate).split('-').map(Number);
    const [y2, m2, d2] = dayKey().split('-').map(Number);
    const diff = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
    return Math.max(diff, 0);
  }

  async returnBook(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    dto: { conditionOnReturn?: string; damageNotes?: string; waiveFine?: boolean },
  ) {
    const rental = await this.prisma.bookRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rental) throw new NotFoundException('Rental nahi mili');
    if (rental.status !== 'ACTIVE' && rental.status !== 'OVERDUE') throw new BadRequestException('Ye rental chal nahi rahi');

    const now = new Date();
    const fineAmount = dto?.waiveFine ? 0 : r2(this.daysLate(rental.dueDate) * rental.finePerDay);

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.bookRental.updateMany({
        where: { id, status: { in: ['ACTIVE', 'OVERDUE'] } },
        data: { status: 'RETURNED' },
      });
      if (claimed.count === 0) throw new BadRequestException('Ye kitab pehle hi wapas ho chuki hai');

      const shopId = await resolveIndustryShopId(tx, user, rental.shopId ?? scope.shopId);
      if (await this.issuedWithStock(tx, user.tenantId, rental.rentalNumber)) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: rental.productId, variantId: rental.variantId, delta: rental.quantity,
          movementType: 'ADJUSTMENT_IN', reference: rental.rentalNumber, note: 'Kiraye se wapas aayi', userId: user.id,
        });
      }
      await this.settleMoney(tx, user, rental, shopId, fineAmount, `Late fine (${rental.rentalNumber})`, 0);

      return tx.bookRental.update({
        where: { id },
        data: {
          actualReturnDate: now,
          returnedAt: now,
          fineAmount,
          conditionOnReturn: dto?.conditionOnReturn,
          damageNotes: dto?.damageNotes,
          returnedToId: user.id,
        },
      });
    });
  }

  /**
   * Charges left on a rental (fine, or the price of a lost copy) are billed
   * and paid out of the deposit; the rest of the deposit goes back to the
   * customer. Anything the deposit does not cover goes on the khata.
   */
  private async settleMoney(tx: any, user: AuthenticatedUser, rental: any, shopId: string, charge: number, label: string, cost: number) {
    // The deposit pays the charge whether or not it went through a drawer;
    // only what went into a drawer is taken back out of one.
    const deposit = r2(rental.depositAmount);
    const inDrawer = await this.depositInDrawer(tx, user.tenantId, rental.rentalNumber);
    if (charge > 0) {
      const fromDeposit = r2(Math.min(charge, deposit));
      const owed = r2(charge - fromDeposit);
      const customerId = rental.customerId ?? (owed > 0
        ? await ensureCustomer(tx, user, { name: rental.customerName, phone: rental.customerPhone, shopId })
        : null);
      await postIndustrySale(tx, user, {
        saleNumber: `BKF-${rental.rentalNumber}`,
        sourceRef: rental.rentalNumber,
        shopId,
        customerId,
        lines: [{ label, amount: charge, cost }],
        paidAmount: fromDeposit,
        paymentMethod: 'CASH',
      });
    }
    if (inDrawer > 0) {
      await drawerCash(tx, user, {
        direction: 'OUT', amount: inDrawer, shopId, reference: rental.rentalNumber,
        reason: `Kitab ka deposit wapas: ${rental.customerName || 'customer'} (${rental.rentalNumber})`,
      });
    }
  }

  /** The copy is not coming back: the customer pays its price (out of the deposit first). */
  async markLost(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const rental = await this.prisma.bookRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rental) throw new NotFoundException('Rental nahi mili');
    if (rental.status !== 'ACTIVE' && rental.status !== 'OVERDUE') throw new BadRequestException('Ye rental chal nahi rahi');
    const product = await this.prisma.product.findFirst({
      where: { id: rental.productId, tenantId: user.tenantId },
      select: { name: true, price: true, costPrice: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.bookRental.updateMany({
        where: { id, status: { in: ['ACTIVE', 'OVERDUE'] } },
        data: { status: 'LOST' },
      });
      if (claimed.count === 0) throw new BadRequestException('Rental abhi badli gayi — dobara koshish karein');

      const shopId = await resolveIndustryShopId(tx, user, rental.shopId ?? scope.shopId);
      // Old rentals never took the copy out of stock; take it out now that it is gone.
      if (!(await this.issuedWithStock(tx, user.tenantId, rental.rentalNumber))) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: rental.productId, variantId: rental.variantId, delta: -rental.quantity,
          movementType: 'ADJUSTMENT_OUT', reference: rental.rentalNumber, note: 'Kiraye wali kitab gum', userId: user.id,
        });
      }
      const price = r2((product?.price ?? 0) * rental.quantity);
      const cost = r2((product?.costPrice ?? 0) * rental.quantity);
      await this.settleMoney(tx, user, rental, shopId, price, `Kitab gum: ${product?.name ?? ''} (${rental.rentalNumber})`, cost);
      return tx.bookRental.findUniqueOrThrow({ where: { id } });
    });
  }

  /** Issued by mistake: the copy goes back on the shelf and the deposit is returned. */
  async cancel(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const rental = await this.prisma.bookRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rental) throw new NotFoundException('Rental nahi mili');
    if (rental.status !== 'ACTIVE' && rental.status !== 'OVERDUE') throw new BadRequestException('Sirf chalti rental cancel ho sakti hai');

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.bookRental.updateMany({
        where: { id, status: { in: ['ACTIVE', 'OVERDUE'] } },
        data: { status: 'CANCELLED' },
      });
      if (claimed.count === 0) throw new BadRequestException('Rental abhi badli gayi — dobara koshish karein');
      const shopId = await resolveIndustryShopId(tx, user, rental.shopId ?? scope.shopId);
      if (await this.issuedWithStock(tx, user.tenantId, rental.rentalNumber)) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: rental.productId, variantId: rental.variantId, delta: rental.quantity,
          movementType: 'ADJUSTMENT_IN', reference: rental.rentalNumber, note: 'Rental cancel', userId: user.id,
        });
      }
      await this.settleMoney(tx, user, rental, shopId, 0, '', 0);
      return tx.bookRental.findUniqueOrThrow({ where: { id } });
    });
  }

  async updateOverdueStatus(user: AuthenticatedUser) {
    return this.prisma.bookRental.updateMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', dueDate: { lt: dayStart() } },
      data: { status: 'OVERDUE' },
    });
  }
}
