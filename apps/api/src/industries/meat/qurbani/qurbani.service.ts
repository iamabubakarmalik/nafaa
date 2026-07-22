import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class QurbaniService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.meatQurbaniBooking.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const bookingNumber = 'QUR-' + year + '-' + String(count + 1).padStart(4, '0');

    return this.prisma.meatQurbaniBooking.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        bookingNumber,
        slaughterDate: dto.slaughterDate ? new Date(dto.slaughterDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; occasion?: string; animalType?: string; search?: string }) {
    return this.prisma.meatQurbaniBooking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.occasion && { occasion: params.occasion }),
        ...(params.animalType && { animalType: params.animalType as any }),
        ...(params.search && {
          OR: [
            { bookingNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { bookedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.meatQurbaniBooking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const b = await this.prisma.meatQurbaniBooking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    return this.prisma.meatQurbaniBooking.update({
      where: { id },
      data: {
        ...dto,
        slaughterDate: dto.slaughterDate ? new Date(dto.slaughterDate) : undefined,
      },
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const b = await this.prisma.meatQurbaniBooking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    const newPaid = b.paidAmount + amount;
    let paymentStatus = 'PARTIAL';
    if (b.finalPrice && newPaid >= b.finalPrice) paymentStatus = 'PAID';
    return this.prisma.meatQurbaniBooking.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    const patch: any = { status };
    if (status === 'CANCELLED') { patch.cancelledAt = new Date(); patch.cancellationReason = reason; }
    return this.prisma.meatQurbaniBooking.update({ where: { id }, data: patch });
  }
}
