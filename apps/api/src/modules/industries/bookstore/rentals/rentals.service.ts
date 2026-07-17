import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays, differenceInDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.bookRental.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const rentalNumber = `RENT-${year}-${String(count + 1).padStart(4, '0')}`;

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : addDays(new Date(), dto.rentalDays || 14);

    return this.prisma.bookRental.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        rentalNumber,
        customerId: dto.customerId,
        productId: dto.productId,
        variantId: dto.variantId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerCnic: dto.customerCnic,
        quantity: dto.quantity || 1,
        rentalPrice: dto.rentalPrice,
        depositAmount: dto.depositAmount || 0,
        dueDate,
        finePerDay: dto.finePerDay || 50,
        conditionOnIssue: dto.conditionOnIssue,
        notes: dto.notes,
        issuedById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: any) {
    return this.prisma.bookRental.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.overdue && { status: 'ACTIVE', dueDate: { lt: new Date() } }),
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    });
  }

  async returnBook(user: AuthenticatedUser, id: string, dto: { conditionOnReturn?: string; damageNotes?: string; waiveFine?: boolean }) {
    const rental = await this.prisma.bookRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rental) throw new NotFoundException('Rental not found');
    if (rental.status !== 'ACTIVE' && rental.status !== 'OVERDUE') throw new BadRequestException('Rental is not active');

    const now = new Date();
    const daysLate = Math.max(0, differenceInDays(now, rental.dueDate));
    const fineAmount = dto.waiveFine ? 0 : daysLate * rental.finePerDay;

    return this.prisma.bookRental.update({
      where: { id },
      data: {
        status: 'RETURNED',
        actualReturnDate: now,
        returnedAt: now,
        fineAmount,
        conditionOnReturn: dto.conditionOnReturn,
        damageNotes: dto.damageNotes,
        returnedToId: user.id,
      },
    });
  }

  async markLost(user: AuthenticatedUser, id: string) {
    const rental = await this.prisma.bookRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rental) throw new NotFoundException('Rental not found');
    return this.prisma.bookRental.update({ where: { id }, data: { status: 'LOST' } });
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const rental = await this.prisma.bookRental.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rental) throw new NotFoundException('Rental not found');
    return this.prisma.bookRental.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async updateOverdueStatus(user: AuthenticatedUser) {
    return this.prisma.bookRental.updateMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', dueDate: { lt: new Date() } },
      data: { status: 'OVERDUE' },
    });
  }
}
