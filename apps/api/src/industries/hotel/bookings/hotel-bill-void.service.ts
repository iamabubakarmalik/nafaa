/**
 * A hotel bill voided at the counter. The shared void has already taken the
 * money and khata entries back (advances stay on the khata); this reopens
 * the stay so it can be billed again:
 *
 * - Check-out bill: the booking goes back to checked in, paid = the money
 *   still on the khata, the guest's stay totals come back out.
 * - Cancellation / no-show charge: noted on the booking; the advance is
 *   back on the khata and can be refunded or used.
 *
 * Nothing is deleted. Rooms are not touched: the guest has left, and the
 * desk checks the stay out again.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { bookingMoney, r2, type Db } from '../common/hotel-common';

@Injectable()
export class HotelBillVoidService implements OnModuleInit {
  private readonly log = new Logger(HotelBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handleVoid(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided hotel bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn((tenantId, saleId) => this.handleReturn(tenantId, saleId).catch((e) => {
      this.log.warn(`Returned hotel bill ${saleId} not noted: ${(e as Error).message}`);
    }));
  }

  private async bookingOf(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { id: true, saleNumber: true, sourceRef: true, status: true, total: true } });
    if (!sale?.sourceRef || !sale.saleNumber.startsWith('HTL-')) return null;
    const booking = await this.prisma.hotelBooking.findFirst({ where: { tenantId, bookingNumber: sale.sourceRef } });
    return booking ? { sale, booking } : null;
  }

  /** Money given back on a hotel bill is noted on the booking. */
  async handleReturn(tenantId: string, saleId: string) {
    const hit = await this.bookingOf(tenantId, saleId);
    if (!hit) return null;
    const note = `Bill ${hit.sale.saleNumber}: wapsi (${hit.sale.status === 'FULLY_RETURNED' ? 'poora bill' : 'kuch hissa'})`;
    return this.prisma.hotelBooking.update({ where: { id: hit.booking.id }, data: { notes: [hit.booking.notes, note].filter(Boolean).join('\n') } });
  }

  async handleVoid(tenantId: string, saleId: string) {
    const hit = await this.bookingOf(tenantId, saleId);
    if (!hit || hit.sale.status !== 'VOIDED') return null;
    const { sale, booking } = hit;
    const note = `Bill ${sale.saleNumber} void`;
    if (!sale.saleNumber.startsWith('HTL-BK')) {
      return this.prisma.hotelBooking.update({ where: { id: booking.id }, data: { notes: [booking.notes, `${note} — charge wapas, advance khata me`].filter(Boolean).join('\n') } });
    }
    if (booking.status !== 'CHECKED_OUT') return null;
    const db = this.prisma as unknown as Db;
    const { khataPaid } = await bookingMoney(db, tenantId, booking.bookingNumber, booking.paidAmount);
    return this.prisma.$transaction(async (tx) => {
      const reopened = await tx.hotelBooking.updateMany({
        where: { id: booking.id, status: 'CHECKED_OUT' },
        data: {
          status: 'CHECKED_IN', actualCheckOut: null, checkedOutBy: null,
          paidAmount: khataPaid, balanceAmount: r2(Math.max(booking.grandTotal - khataPaid, 0)),
          paymentStatus: khataPaid >= booking.grandTotal - 0.009 ? 'PAID' : khataPaid > 0 ? 'PARTIAL' : 'UNPAID',
          notes: [booking.notes, `${note} — dobara check-out karein`].filter(Boolean).join('\n'),
        },
      });
      if (!reopened.count || !booking.primaryGuestId) return reopened;
      const guest = await tx.hotelGuest.findFirst({ where: { id: booking.primaryGuestId, tenantId } });
      if (guest) {
        await tx.hotelGuest.update({
          where: { id: guest.id },
          data: {
            totalStays: Math.max(guest.totalStays - 1, 0),
            totalNights: Math.max(guest.totalNights - booking.nights, 0),
            totalSpent: r2(Math.max(guest.totalSpent - booking.grandTotal, 0)),
          },
        });
      }
      return reopened;
    });
  }
}
