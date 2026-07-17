import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class FolioService {
  constructor(private readonly prisma: PrismaService) {}

  async addCharge(user: AuthenticatedUser, dto: any) {
    const booking = await this.prisma.hotelBooking.findFirst({ where: { id: dto.bookingId, tenantId: user.tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot add charge to closed booking');
    }

    const count = await this.prisma.hotelFolioCharge.count({ where: { bookingId: dto.bookingId } });
    const chargeNumber = 'FC-' + booking.bookingNumber + '-' + String(count + 1).padStart(3, '0');

    const quantity = Number(dto.quantity) || 1;
    const unitPrice = Number(dto.unitPrice) || 0;
    const taxAmount = Number(dto.taxAmount) || 0;
    const discount = Number(dto.discount) || 0;
    const totalAmount = Math.max((quantity * unitPrice) + taxAmount - discount, 0);

    return this.prisma.$transaction(async (tx) => {
      const charge = await tx.hotelFolioCharge.create({
        data: {
          bookingId: dto.bookingId,
          chargeNumber,
          chargeDate: dto.chargeDate ? new Date(dto.chargeDate) : new Date(),
          chargeType: dto.chargeType,
          description: dto.description,
          quantity,
          unitPrice,
          taxAmount,
          discount,
          totalAmount,
          reference: dto.reference,
          postedById: user.id,
          notes: dto.notes,
        },
      });

      // Update booking totals
      const newExtraCharges = booking.extraCharges + totalAmount;
      const newGrandTotal = booking.grandTotal + totalAmount;
      const newBalance = Math.max(newGrandTotal - booking.paidAmount, 0);
      await tx.hotelBooking.update({
        where: { id: dto.bookingId },
        data: {
          extraCharges: newExtraCharges,
          grandTotal: newGrandTotal,
          balanceAmount: newBalance,
          paymentStatus: newBalance <= 0 ? 'PAID' : booking.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        },
      });

      return charge;
    });
  }

  async byBooking(user: AuthenticatedUser, bookingId: string) {
    return this.prisma.hotelFolioCharge.findMany({
      where: { bookingId, isVoid: false },
      orderBy: { chargeDate: 'desc' },
    });
  }

  async voidCharge(user: AuthenticatedUser, id: string, reason: string) {
    const c = await this.prisma.hotelFolioCharge.findUnique({ where: { id }, include: { booking: true } });
    if (!c) throw new NotFoundException('Charge not found');
    if (c.booking.tenantId !== user.tenantId) throw new NotFoundException('Charge not found');
    if (c.isVoid) throw new BadRequestException('Already voided');

    return this.prisma.$transaction(async (tx) => {
      await tx.hotelFolioCharge.update({
        where: { id },
        data: { isVoid: true, voidedAt: new Date(), voidReason: reason },
      });
      // Reverse from booking
      const newExtra = Math.max(c.booking.extraCharges - c.totalAmount, 0);
      const newGrandTotal = Math.max(c.booking.grandTotal - c.totalAmount, 0);
      const newBalance = Math.max(newGrandTotal - c.booking.paidAmount, 0);
      return tx.hotelBooking.update({
        where: { id: c.bookingId },
        data: {
          extraCharges: newExtra,
          grandTotal: newGrandTotal,
          balanceAmount: newBalance,
        },
      });
    });
  }
}
