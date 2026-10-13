import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateRentalDto, ReturnRentalDto, UpdateRentalStatusDto } from './dto/create-rental.dto';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

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

    const totalPrice = r2(dto.daysRented * dto.pricePerDay);
    const paidAmount = r2(Math.max(dto.paidAmount ?? 0, 0));
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
          ...dto,
          customerId,
          paidAmount,
          rentalStartDate: new Date(dto.rentalStartDate),
          rentalEndDate: new Date(dto.rentalEndDate),
          totalPrice,
          remainingAmount,
          photosAtCheckout: dto.photosAtCheckout ?? [],
          status: 'ACTIVE',
        },
      });
      if (totalPrice > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: `GMR-${rentalNumber}`,
          sourceRef: rentalNumber,
          shopId,
          customerId,
          lines: [{ label: `Kiraya: ${dto.productName} × ${dto.daysRented} din`, amount: totalPrice }],
          paidAmount,
        });
      }
      return rental;
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.gamingRental.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to ? {
          rentalStartDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { rentalNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { productName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { rentalStartDate: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.gamingRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rental not found');
    return r;
  }

  async returnRental(user: AuthenticatedUser, id: string, dto: ReturnRentalDto) {
    const r = await this.prisma.gamingRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rental not found');
    if (r.status !== 'ACTIVE' && r.status !== 'OVERDUE') {
      throw new BadRequestException('Only active/overdue rentals can be returned');
    }

    const now = new Date();
    const rentalEnd = new Date(r.rentalEndDate);
    const isLate = now > rentalEnd;
    const daysLate = isLate ? Math.ceil((now.getTime() - rentalEnd.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const damageFee = dto.damageFee ?? 0;
    const lateFee = dto.lateFee ?? (daysLate * r.pricePerDay);
    const depositRefunded = Math.max((dto.depositRefunded ?? r.depositAmount) - damageFee - lateFee, 0);

    // Late and damage fees are kept from the deposit, so they are income
    // received now; they are posted as a second bill on the rental.
    const fees = r2(damageFee + lateFee);
    if (fees > 0) {
      await this.prisma.$transaction(async (tx) => {
        await postIndustrySale(tx, user, {
          saleNumber: `GMR-${r.rentalNumber}-R`,
          sourceRef: r.rentalNumber,
          shopId: await resolveIndustryShopId(tx, user, null),
          customerId: r.customerId,
          lines: [
            { label: `Late fee (${daysLate} din)`, amount: lateFee },
            { label: 'Damage fee', amount: damageFee },
          ],
          paidAmount: fees,
        });
      });
    }

    return this.prisma.gamingRental.update({
      where: { id },
      data: {
        status: 'RETURNED',
        actualReturnDate: now,
        conditionAtReturn: dto.conditionAtReturn,
        photosAtReturn: dto.photosAtReturn ?? [],
        damageFee,
        lateFee,
        depositRefunded,
        totalPrice: r.totalPrice + damageFee + lateFee,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateRentalStatusDto) {
    const r = await this.prisma.gamingRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rental not found');
    return this.prisma.gamingRental.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes ? ((r.notes || '') + '\n' + dto.notes).trim() : undefined,
      },
    });
  }

  async markOverdue(user: AuthenticatedUser) {
    const now = new Date();
    return this.prisma.gamingRental.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        rentalEndDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const [active, overdue, returned, revenue] = await Promise.all([
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'OVERDUE' } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'RETURNED' } }),
      this.prisma.gamingRental.aggregate({ where: { tenantId: user.tenantId }, _sum: { totalPrice: true, paidAmount: true } }),
    ]);
    return {
      active, overdue, returned,
      totalRevenue: revenue._sum.totalPrice ?? 0,
      collected: revenue._sum.paidAmount ?? 0,
    };
  }
}
