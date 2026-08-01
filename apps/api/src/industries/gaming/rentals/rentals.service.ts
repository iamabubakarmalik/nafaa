import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateRentalDto, ReturnRentalDto, UpdateRentalStatusDto } from './dto/create-rental.dto';

@Injectable()
export class GamingRentalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateRentalDto) {
    const count = await this.prisma.gamingRental.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const rentalNumber = `RENT-${year}-${String(count + 1).padStart(4, '0')}`;

    const totalPrice = dto.daysRented * dto.pricePerDay;
    const paidAmount = dto.paidAmount ?? 0;
    const remainingAmount = Math.max(totalPrice - paidAmount, 0);

    return this.prisma.gamingRental.create({
      data: {
        tenantId: user.tenantId,
        rentalNumber,
        ...dto,
        rentalStartDate: new Date(dto.rentalStartDate),
        rentalEndDate: new Date(dto.rentalEndDate),
        totalPrice,
        remainingAmount,
        photosAtCheckout: dto.photosAtCheckout ?? [],
        status: 'ACTIVE',
      },
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
