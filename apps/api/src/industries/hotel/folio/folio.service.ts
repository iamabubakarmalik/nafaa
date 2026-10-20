/**
 * Folio: room service, restaurant, laundry and other charges on a stay,
 * billed with the room nights at check-out. A charge for a catalog item
 * (minibar, food) takes its stock when it is posted; voiding the charge
 * puts it back. The item, its cost and the branch whose stock was used are
 * kept on the charge (productId, unitCost, shopId) so the bill carries the
 * cost. Charges posted before those columns existed keep them in
 * `reference` as `stock:<productId>:<unitCost>:<shopId|->`; folioStock
 * reads both.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta, isServiceProduct } from '../../../common/shop-scope';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { IN_HOUSE, folioStock, found, r2 } from '../common/hotel-common';
import { FolioChargeDto } from '../common/hotel.dto';

/** Charges can be posted to a stay that is booked or in the hotel. */
const POSTABLE = ['CONFIRMED', 'TENTATIVE', ...IN_HOUSE];

@Injectable()
export class FolioService {
  constructor(private readonly prisma: PrismaService) {}

  async addCharge(user: AuthenticatedUser, dto: FolioChargeDto) {
    const booking = found(await this.prisma.hotelBooking.findFirst({ where: { id: dto.bookingId, tenantId: user.tenantId } }), 'Booking');
    if (!POSTABLE.includes(booking.status)) throw new BadRequestException('Band booking par charge nahi lagta');
    const description = dto.description.trim();
    if (!description) throw new BadRequestException('Charge ka naam likhein');
    const quantity = r2(dto.quantity ?? 1);
    const product = dto.productId
      ? found(await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId, isActive: true } }), 'Item')
      : null;
    const unitPrice = r2(dto.unitPrice ?? product?.price ?? 0);
    if (!(unitPrice > 0)) throw new BadRequestException('Rate likhein');
    const taxAmount = r2(dto.taxAmount ?? 0);
    const discount = r2(dto.discount ?? 0);
    const totalAmount = r2(quantity * unitPrice + taxAmount - discount);
    if (!(totalAmount > 0)) throw new BadRequestException('Charge ki amount 0 se zyada honi chahiye');

    return this.prisma.$transaction(async (tx) => {
      // shopId is set only when stock was taken, so a void knows where to put it back.
      let stockShopId: string | null = null;
      if (product && !isServiceProduct(product)) {
        stockShopId = await resolveIndustryShopId(tx, user, booking.shopId);
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: stockShopId, productId: product.id, delta: -quantity, movementType: 'SALE_OUT',
          reference: booking.bookingNumber, note: `Room folio: ${description}`, preventNegative: true, label: product.name, userId: user.id,
        });
      }
      const count = await tx.hotelFolioCharge.count({ where: { bookingId: booking.id } });
      const charge = await tx.hotelFolioCharge.create({
        data: {
          bookingId: booking.id, chargeNumber: `FC-${booking.bookingNumber}-${String(count + 1).padStart(3, '0')}`,
          chargeDate: new Date(), chargeType: dto.chargeType, description, quantity, unitPrice, taxAmount, discount, totalAmount,
          postedById: user.id, notes: dto.notes?.trim() || null,
          productId: product?.id ?? null, unitCost: product ? r2(product.costPrice ?? 0) : null, shopId: stockShopId,
        },
      });
      await this.retotal(tx, booking.id, totalAmount);
      return charge;
    });
  }

  /** Adds `delta` to the booking's charges and works the totals out again. */
  private async retotal(tx: any, bookingId: string, delta: number) {
    const b = await tx.hotelBooking.update({
      where: { id: bookingId }, data: { extraCharges: { increment: delta }, grandTotal: { increment: delta } },
      select: { grandTotal: true, paidAmount: true },
    });
    const balance = r2(Math.max(b.grandTotal - b.paidAmount, 0));
    await tx.hotelBooking.update({
      where: { id: bookingId },
      data: { balanceAmount: balance, paymentStatus: balance <= 0.009 ? 'PAID' : b.paidAmount > 0 ? 'PARTIAL' : 'UNPAID' },
    });
  }

  async byBooking(user: AuthenticatedUser, bookingId: string) {
    found(await this.prisma.hotelBooking.findFirst({ where: { id: bookingId, tenantId: user.tenantId }, select: { id: true } }), 'Booking');
    return this.prisma.hotelFolioCharge.findMany({ where: { bookingId }, orderBy: { chargeDate: 'desc' } });
  }

  async voidCharge(user: AuthenticatedUser, id: string, reason: string) {
    const c = found(await this.prisma.hotelFolioCharge.findFirst({ where: { id, booking: { tenantId: user.tenantId } }, include: { booking: true } }), 'Charge');
    if (c.isVoid) throw new BadRequestException('Ye charge pehle hi hat chuka');
    if (!POSTABLE.includes(c.booking.status)) throw new BadRequestException('Bill ban chuka — ab charge nahi hatta (bill void ya return karein)');
    const why = reason?.trim();
    if (!why) throw new BadRequestException('Charge hatane ki wajah likhein');

    return this.prisma.$transaction(async (tx) => {
      const done = await tx.hotelFolioCharge.updateMany({ where: { id, isVoid: false }, data: { isVoid: true, voidedAt: new Date(), voidReason: why } });
      if (!done.count) throw new BadRequestException('Ye charge pehle hi hat chuka');
      const stock = folioStock(c);
      if (stock?.shopId) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: stock.shopId, productId: stock.productId, delta: c.quantity, movementType: 'RETURN_IN',
          reference: c.booking.bookingNumber, note: `Folio charge hata: ${c.description}`, userId: user.id,
        });
      }
      await this.retotal(tx, c.bookingId, -c.totalAmount);
      return tx.hotelFolioCharge.findUniqueOrThrow({ where: { id } });
    });
  }
}
