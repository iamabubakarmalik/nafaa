/**
 * Console and game rentals. The rent is income on the day the item goes
 * out (its own bill; the unpaid part is udhaar on the customer's khata).
 * The security deposit is the customer's money: it is kept aside, not
 * posted as a sale. On return, late and damage fees are taken from the
 * deposit first; anything above the deposit is paid then or goes on the
 * khata, and the rest of the deposit is handed back. A rental is cancelled
 * by voiding its bill from Sales.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateRentalDto, ReturnRentalDto, UpdateRentalStatusDto } from './dto/create-rental.dto';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { BILL_PREFIX, r2 } from '../common/gaming-catalog';

const DAY = 86_400_000;
/** Statuses set by hand; cancelling goes through the bill. */
const MANUAL = ['DAMAGED', 'LOST', 'OVERDUE', 'ACTIVE'];

@Injectable()
export class GamingRentalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateRentalDto) {
    const prefix = `RENT-${new Date().getFullYear()}-`;
    const last = await this.prisma.gamingRental.findFirst({
      where: { tenantId: user.tenantId, rentalNumber: { startsWith: prefix } },
      orderBy: { rentalNumber: 'desc' },
      select: { rentalNumber: true },
    });
    const rentalNumber = prefix + String((last ? Number(last.rentalNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(4, '0');

    const start = new Date(dto.rentalStartDate);
    const end = new Date(dto.rentalEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Shuru aur wapsi ki date likhein');
    if (end.getTime() <= start.getTime()) throw new BadRequestException('Wapsi ki date shuru se baad honi chahiye');
    if (!(dto.daysRented >= 1)) throw new BadRequestException('Kam se kam 1 din');
    if (!(dto.pricePerDay >= 0)) throw new BadRequestException('Kiraya manfi nahi ho sakta');
    if ((dto.depositAmount ?? 0) < 0) throw new BadRequestException('Deposit manfi nahi ho sakta');
    if (!dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');
    const { paymentMethod: _method, ...fields } = dto;
    const totalPrice = r2(dto.daysRented * dto.pricePerDay);
    const paidAmount = r2(Math.max(dto.paidAmount ?? totalPrice, 0));
    if (paidAmount > totalPrice + 0.01) throw new BadRequestException(`Kiraya sirf Rs ${totalPrice} hai (deposit alag hai)`);
    const remainingAmount = r2(Math.max(totalPrice - paidAmount, 0));

    // The rent is income on the day the item goes out; the unpaid part is udhaar.
    // The deposit is the customer's money and is not posted as a sale.
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      const customerId = remainingAmount > 0 || dto.customerId
        ? await ensureCustomer(tx, user, { customerId: dto.customerId, name: dto.customerName, phone: dto.customerPhone, shopId })
        : null;
      const rental = await tx.gamingRental.create({
        data: {
          tenantId: user.tenantId,
          rentalNumber,
          ...fields,
          customerName: dto.customerName.trim(),
          depositAmount: r2(dto.depositAmount ?? 0),
          customerId,
          paidAmount,
          rentalStartDate: start,
          rentalEndDate: end,
          totalPrice,
          remainingAmount,
          photosAtCheckout: dto.photosAtCheckout ?? [],
          status: 'ACTIVE',
        },
      });
      if (totalPrice > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: `${BILL_PREFIX.rental}${rentalNumber}`,
          sourceRef: rentalNumber,
          shopId,
          customerId,
          lines: [{ label: `Kiraya: ${dto.productName} × ${dto.daysRented} din`, amount: totalPrice }],
          paidAmount,
          paymentMethod: dto.paymentMethod,
        });
      }
      return rental;
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) {
    const now = new Date();
    const where: Prisma.GamingRentalWhereInput = {
      tenantId: user.tenantId,
      // "Late" is read from the date, so a rental is late the moment its day passes.
      ...(params.status === 'OVERDUE' ? { OR: [{ status: 'OVERDUE' }, { status: 'ACTIVE', rentalEndDate: { lt: now } }] }
        : params.status === 'ACTIVE' ? { status: 'ACTIVE', rentalEndDate: { gte: now } }
          : params.status ? { status: params.status as any } : {}),
      ...(params.customerId && { customerId: params.customerId }),
      ...(params.from || params.to ? {
        rentalStartDate: {
          ...(params.from && { gte: new Date(params.from) }),
          ...(params.to && { lte: new Date(params.to) }),
        },
      } : {}),
      ...(params.search && {
        AND: [{
          OR: [
            { rentalNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { productName: { contains: params.search, mode: 'insensitive' } },
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }],
      }),
    };
    const mark = <T extends { status: string; rentalEndDate: Date }>(r: T) => (r.status === 'ACTIVE' && r.rentalEndDate < now ? { ...r, status: 'OVERDUE' as const } : r);
    if (!params.page) {
      const rows = await this.prisma.gamingRental.findMany({ where, orderBy: [{ status: 'asc' }, { rentalStartDate: 'desc' }], take: 200 });
      return rows.map(mark);
    }
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const [items, total] = await Promise.all([
      this.prisma.gamingRental.findMany({ where, orderBy: [{ rentalEndDate: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.gamingRental.count({ where }),
    ]);
    return { items: items.map(mark), total, page, limit };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.gamingRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rental nahi mila');
    return r;
  }

  async returnRental(user: AuthenticatedUser, id: string, dto: ReturnRentalDto) {
    const r = await this.prisma.gamingRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rental nahi mila');
    if (r.status !== 'ACTIVE' && r.status !== 'OVERDUE') throw new BadRequestException('Sirf bahar gaya hua saman wapas hota hai');

    const now = new Date();
    const daysLate = now > r.rentalEndDate ? Math.ceil((now.getTime() - r.rentalEndDate.getTime()) / DAY) : 0;
    const damageFee = r2(Math.max(dto.damageFee ?? 0, 0));
    const lateFee = r2(Math.max(dto.lateFee ?? daysLate * r.pricePerDay, 0));
    const fees = r2(damageFee + lateFee);
    // Fees come out of the deposit first; the rest is paid now or goes on the khata.
    const fromDeposit = r2(Math.min(fees, r.depositAmount));
    const extra = r2(fees - fromDeposit);
    const paidNow = r2(Math.min(Math.max(dto.paidAmount ?? extra, 0), extra));
    const depositRefunded = r2(r.depositAmount - fromDeposit);

    return this.prisma.$transaction(async (tx) => {
      if (fees > 0) {
        const shopId = await resolveIndustryShopId(tx, user, null);
        const customerId = paidNow < extra - 0.009 || r.customerId
          ? await ensureCustomer(tx, user, { customerId: r.customerId, name: r.customerName, phone: r.customerPhone, shopId })
          : null;
        await postIndustrySale(tx, user, {
          saleNumber: `${BILL_PREFIX.rental}${r.rentalNumber}-R`,
          sourceRef: r.rentalNumber,
          shopId,
          customerId,
          lines: [
            { label: `Late fee (${daysLate} din)`, amount: lateFee },
            { label: 'Nuqsan (damage) fee', amount: damageFee },
          ],
          paidAmount: r2(fromDeposit + paidNow),
          paymentMethod: dto.paymentMethod,
        });
      }
      return tx.gamingRental.update({
        where: { id },
        data: {
          status: 'RETURNED',
          actualReturnDate: now,
          conditionAtReturn: dto.conditionAtReturn,
          photosAtReturn: dto.photosAtReturn ?? [],
          damageFee,
          lateFee,
          depositRefunded,
          totalPrice: r2(r.totalPrice + fees),
          paidAmount: r2(r.paidAmount + fromDeposit + paidNow),
          remainingAmount: r2(r.remainingAmount + extra - paidNow),
        },
      });
    });
  }

  /** Damaged, lost or late marks; a rental is cancelled by voiding its bill. */
  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateRentalStatusDto) {
    const r = await this.prisma.gamingRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rental nahi mila');
    if (!MANUAL.includes(dto.status)) throw new BadRequestException(dto.status === 'CANCELLED' ? 'Rental cancel karne ke liye Sales me us ka bill cancel karein' : 'Ye status yahan se nahi lagta');
    if (r.status === 'RETURNED' || r.status === 'CANCELLED') throw new BadRequestException('Ye rental band ho chuka hai');
    return this.prisma.gamingRental.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes ? [r.notes, dto.notes].filter(Boolean).join('\n').slice(0, 1000) : undefined },
    });
  }

  async markOverdue(user: AuthenticatedUser) {
    return this.prisma.gamingRental.updateMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', rentalEndDate: { lt: new Date() } },
      data: { status: 'OVERDUE' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const now = new Date();
    const [active, overdue, returned, revenue, deposits] = await Promise.all([
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'ACTIVE', rentalEndDate: { gte: now } } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, OR: [{ status: 'OVERDUE' }, { status: 'ACTIVE', rentalEndDate: { lt: now } }] } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'RETURNED' } }),
      this.prisma.gamingRental.aggregate({ where: { tenantId: user.tenantId, status: { not: 'CANCELLED' } }, _sum: { totalPrice: true, paidAmount: true, remainingAmount: true } }),
      this.prisma.gamingRental.aggregate({ where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'OVERDUE'] } }, _sum: { depositAmount: true } }),
    ]);
    return {
      active, overdue, returned,
      totalRevenue: r2(Number(revenue._sum.totalPrice ?? 0)),
      collected: r2(Number(revenue._sum.paidAmount ?? 0)),
      due: r2(Number(revenue._sum.remainingAmount ?? 0)),
      depositsHeld: r2(Number(deposits._sum.depositAmount ?? 0)),
    };
  }
}
