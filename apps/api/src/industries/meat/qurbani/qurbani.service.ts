import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope } from '../../../common/shop-scope';
import { postIndustrySale } from '../../_shared/industry-sale.helper';
import { dayKey, parseDay } from '../meat-common';
import {
  checkRefundPin, mustChange, payMethod, r2, recordMoney, refundAdvance, str, takeAdvance, withNextNumber,
} from '../meat-money';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
type Body = any;

const ANIMALS = ['BEEF', 'MUTTON', 'GOAT', 'LAMB', 'CAMEL', 'BUFFALO', 'OTHER'];
/** Animals shared by up to seven people; the rest are one person's. */
const SHARED = ['BEEF', 'CAMEL', 'BUFFALO'];
const OCCASIONS = ['QURBANI', 'AQEEQA', 'SADQA', 'NAZAR', 'OTHER'];
const STATUSES = ['BOOKED', 'CONFIRMED', 'SLAUGHTERED', 'COMPLETED', 'CANCELLED'] as const;
const LABEL = 'Qurbani booking';
const BILL = 'QRB-';

/**
 * Qurbani / aqeeqa shares. Advances go on the customer's khata on the day
 * they are paid; when the meat is handed over the booking becomes one bill
 * (the share price, cost from the linked animal), and the advance cancels it
 * on the khata. Cancelled bookings can get the advance back in cash.
 */
@Injectable()
export class QurbaniService implements OnModuleInit {
  private readonly log = new Logger(QurbaniService.name);

  constructor(private readonly prisma: PrismaService, private readonly sales: SalesService) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.reopen(tenantId, saleId).catch((e) => this.log.warn(`Booking of voided bill ${saleId} not reopened: ${(e as Error).message}`)));
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: Body) {
    const customerName = str(dto?.customerName, 120);
    const customerPhone = str(dto?.customerPhone, 30);
    if (!customerName) throw new BadRequestException('Customer ka naam likhein');
    if (!customerPhone) throw new BadRequestException('Customer ka phone likhein');
    const animalType = ANIMALS.includes(dto?.animalType) ? dto.animalType : null;
    if (!animalType) throw new BadRequestException('Janwar chunein');
    const shareCount = Math.round(Number(dto?.shareCount) || 1);
    if (shareCount < 1 || shareCount > (SHARED.includes(animalType) ? 7 : 1)) throw new BadRequestException(SHARED.includes(animalType) ? 'Hisse 1 se 7 tak' : 'Bakra / dumba ek hi hissa hota hai');
    const finalPrice = Number(dto?.finalPrice) > 0 ? r2(Number(dto.finalPrice)) : null;
    const advance = r2(Math.max(Number(dto?.advanceAmount) || 0, 0));
    if (finalPrice !== null && advance > finalPrice + 0.005) throw new BadRequestException('Advance qeemat se zyada nahi ho sakta');
    const method = advance > 0 ? payMethod(dto?.paymentMethod) : null;
    const liveAnimalId = await this.animalId(user, dto?.liveAnimalId);
    const year = dayKey().slice(0, 4);

    return withNextNumber(
      async (prefix) => (await this.prisma.meatQurbaniBooking.findFirst({ where: { tenantId: user.tenantId, bookingNumber: { startsWith: prefix } }, orderBy: { bookingNumber: 'desc' }, select: { bookingNumber: true } }))?.bookingNumber,
      `QUR-${year}-`, 4,
      (bookingNumber) => this.prisma.$transaction(async (tx) => {
        const customerId = advance > 0
          ? await takeAdvance(tx, user, { reference: bookingNumber, label: LABEL, amount: advance, method, customerId: str(dto?.customerId), name: customerName, phone: customerPhone, shopId: scope.shopId })
          : str(dto?.customerId);
        return tx.meatQurbaniBooking.create({
          data: {
            ...this.fields(dto), tenantId: user.tenantId, bookingNumber, customerId, customerName, customerPhone, animalType, shareCount,
            occasion: OCCASIONS.includes(dto?.occasion) ? dto.occasion : 'QURBANI', finalPrice, advanceAmount: advance, paidAmount: advance,
            paymentStatus: this.payStatus(advance, finalPrice), liveAnimalId, status: 'BOOKED',
          },
        });
      }),
    );
  }

  async list(user: AuthenticatedUser, params: { status?: string; occasion?: string; animalType?: string; search?: string }) {
    const s = params.search?.trim();
    return this.prisma.meatQurbaniBooking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.occasion && { occasion: params.occasion }),
        ...(params.animalType && ANIMALS.includes(params.animalType) && { animalType: params.animalType as never }),
        ...(s && { OR: [{ bookingNumber: { contains: s, mode: 'insensitive' } }, { customerName: { contains: s, mode: 'insensitive' } }, { customerPhone: { contains: s } }] }),
      },
      orderBy: { bookedAt: 'desc' },
      take: 500,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.mustFind(user, id);
    const [money, bill] = await Promise.all([
      recordMoney(this.prisma, user.tenantId, b.bookingNumber, b.paidAmount),
      this.bill(user.tenantId, b.bookingNumber),
    ]);
    return { ...b, ...money, bill };
  }

  async update(user: AuthenticatedUser, id: string, dto: Body) {
    const b = await this.mustFind(user, id);
    if (b.status === 'COMPLETED' || b.status === 'CANCELLED') throw new BadRequestException('Mukammal ya cancel booking badli nahi ja sakti');
    const data: Prisma.MeatQurbaniBookingUpdateManyMutationInput = this.fields(dto);
    if (dto?.customerName !== undefined) data.customerName = str(dto.customerName, 120) ?? b.customerName;
    if (dto?.customerPhone !== undefined) data.customerPhone = str(dto.customerPhone, 30) ?? b.customerPhone;
    if (dto?.finalPrice !== undefined) {
      const price = Number(dto.finalPrice) > 0 ? r2(Number(dto.finalPrice)) : null;
      if (price !== null && price + 0.005 < b.paidAmount) throw new BadRequestException(`${b.paidAmount} mil chuka hai — qeemat is se kam nahi ho sakti`);
      data.finalPrice = price;
      data.paymentStatus = this.payStatus(b.paidAmount, price);
    }
    if (dto?.liveAnimalId !== undefined) data.liveAnimalId = await this.animalId(user, dto.liveAnimalId);
    const done = await this.prisma.meatQurbaniBooking.updateMany({ where: { id, tenantId: user.tenantId, updatedAt: b.updatedAt }, data });
    mustChange(done.count);
    return this.getOne(user, id);
  }

  async addPayment(user: AuthenticatedUser, scope: ShopScope, id: string, body: Body) {
    const amount = r2(Number(body?.amount));
    if (!(amount > 0)) throw new BadRequestException('Amount likhein');
    const b = await this.mustFind(user, id);
    if (b.status === 'COMPLETED' || b.status === 'CANCELLED') throw new BadRequestException(b.status === 'COMPLETED' ? 'Booking mukammal — baqi paisa khate se lein' : 'Cancel booking par paisa nahi liya ja sakta');
    const paid = r2(b.paidAmount + amount);
    if (b.finalPrice && paid > b.finalPrice + 0.005) throw new BadRequestException(`Baqi sirf ${r2(b.finalPrice - b.paidAmount)} hai`);
    const method = payMethod(body?.paymentMethod);
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.meatQurbaniBooking.updateMany({ where: { id, tenantId: user.tenantId, paidAmount: b.paidAmount }, data: { paidAmount: paid, paymentStatus: this.payStatus(paid, b.finalPrice) } });
      mustChange(done.count);
      const customerId = await takeAdvance(tx, user, { reference: b.bookingNumber, label: LABEL, amount, method, customerId: b.customerId, name: b.customerName, phone: b.customerPhone, shopId: scope.shopId });
      if (customerId !== b.customerId) await tx.meatQurbaniBooking.updateMany({ where: { id, tenantId: user.tenantId }, data: { customerId } });
    });
    return this.getOne(user, id);
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    const b = await this.mustFind(user, id);
    if (!(STATUSES as readonly string[]).includes(status) || status === 'COMPLETED') throw new BadRequestException(status === 'COMPLETED' ? 'Mukammal "Bill bana kar de diya" se hoti hai' : 'Ye halat nahi chal sakti');
    if (b.status === 'COMPLETED') throw new BadRequestException('Booking mukammal ho chuki — bill void karne se hi wapas khulti hai');
    if (b.status === status) return this.getOne(user, id);
    const patch: Prisma.MeatQurbaniBookingUpdateManyMutationInput = { status };
    if (status === 'CANCELLED') {
      const why = str(reason, 300);
      if (!why) throw new BadRequestException('Cancel ki wajah likhein');
      Object.assign(patch, { cancelledAt: new Date(), cancellationReason: why });
    } else if (b.status === 'CANCELLED') Object.assign(patch, { cancelledAt: null, cancellationReason: null });
    if (status === 'SLAUGHTERED' && !b.slaughterDate) patch.slaughterDate = new Date();
    const done = await this.prisma.meatQurbaniBooking.updateMany({ where: { id, tenantId: user.tenantId, status: b.status }, data: patch });
    mustChange(done.count);
    return this.getOne(user, id);
  }

  /**
   * Hand-over: the booking becomes one bill. Money taken now is paid on the
   * bill; the unpaid part goes on the khata, where the advance cancels it.
   */
  async complete(user: AuthenticatedUser, scope: ShopScope, id: string, body: Body) {
    const b = await this.mustFind(user, id);
    if (b.status === 'COMPLETED') throw new BadRequestException('Booking pehle hi mukammal hai');
    if (b.status === 'CANCELLED') throw new BadRequestException('Cancel booking mukammal nahi ho sakti');
    if (!b.finalPrice) throw new BadRequestException('Pehle hisse ki poori qeemat likhein');
    const paidNow = r2(Math.max(Number(body?.paidNow) || 0, 0));
    const method = paidNow > 0 ? payMethod(body?.paymentMethod) : 'CASH';
    const { khataPaid, legacyPaid } = await recordMoney(this.prisma, user.tenantId, b.bookingNumber, b.paidAmount);
    const due = r2(b.finalPrice - khataPaid - legacyPaid);
    if (paidNow > due + 0.005) throw new BadRequestException(`Baqi sirf ${Math.max(due, 0)} hai`);
    if (r2(due - paidNow) > 0.005 && !b.customerId) throw new BadRequestException('Baqi paisa udhaar ke liye customer ka khata chahiye — pehle advance lein ya poora paisa lein');
    const animal = b.liveAnimalId ? await this.prisma.meatLiveAnimal.findFirst({ where: { id: b.liveAnimalId, tenantId: user.tenantId }, select: { tagNumber: true, purchasePrice: true, animalType: true } }) : null;
    const cost = animal ? r2((animal.purchasePrice * b.shareCount) / (SHARED.includes(animal.animalType) ? 7 : 1)) : 0;
    const count = await this.prisma.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: `${BILL}${b.bookingNumber}` } } });

    return this.prisma.$transaction(async (tx) => {
      const done = await tx.meatQurbaniBooking.updateMany({ where: { id, tenantId: user.tenantId, status: b.status }, data: { status: 'COMPLETED', paidAmount: r2(b.paidAmount + paidNow), paymentStatus: 'PAID' } });
      mustChange(done.count);
      const sale = await postIndustrySale(tx, user, {
        saleNumber: `${BILL}${b.bookingNumber}${count ? `-${count + 1}` : ''}`, sourceRef: b.bookingNumber, shopId: scope.shopId, customerId: b.customerId,
        lines: [{ label: `${b.occasion === 'QURBANI' ? 'Qurbani' : b.occasion} hissa x${b.shareCount}${animal ? ` (${animal.tagNumber})` : ''}`, amount: b.finalPrice!, cost, quantity: b.shareCount }],
        paidAmount: r2(paidNow + legacyPaid), paymentMethod: method,
      });
      return { booking: await tx.meatQurbaniBooking.findFirst({ where: { id } }), sale: { id: sale.id, saleNumber: sale.saleNumber, total: sale.total } };
    }, { timeout: 20_000 });
  }

  async refund(user: AuthenticatedUser, scope: ShopScope, id: string, managerPin?: string) {
    const b = await this.mustFind(user, id);
    if (b.status !== 'CANCELLED') throw new BadRequestException('Advance sirf cancel booking ka wapas hota hai');
    await checkRefundPin(this.prisma, user, managerPin);
    await this.prisma.$transaction(async (tx) => {
      const amount = await refundAdvance(tx, user, { reference: b.bookingNumber, label: LABEL, customerId: b.customerId, paidAmount: b.paidAmount, shopId: scope.shopId });
      const paid = r2(Math.max(b.paidAmount - amount, 0));
      const done = await tx.meatQurbaniBooking.updateMany({ where: { id, tenantId: user.tenantId, paidAmount: b.paidAmount }, data: { paidAmount: paid, paymentStatus: this.payStatus(paid, b.finalPrice) } });
      mustChange(done.count);
    });
    return this.getOne(user, id);
  }

  /** A voided hand-over bill opens the booking again with only the khata advance as paid. */
  async reopen(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId, status: 'VOIDED', saleNumber: { startsWith: BILL } }, select: { sourceRef: true } });
    if (!sale?.sourceRef || (await this.bill(tenantId, sale.sourceRef))) return;
    const b = await this.prisma.meatQurbaniBooking.findFirst({ where: { tenantId, bookingNumber: sale.sourceRef, status: 'COMPLETED' } });
    if (!b) return;
    const { khataPaid } = await recordMoney(this.prisma, tenantId, b.bookingNumber, b.paidAmount);
    await this.prisma.meatQurbaniBooking.updateMany({ where: { id: b.id, status: 'COMPLETED' }, data: { status: 'SLAUGHTERED', paidAmount: khataPaid, paymentStatus: this.payStatus(khataPaid, b.finalPrice) } });
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private bill(tenantId: string, bookingNumber: string) {
    return this.prisma.sale.findFirst({
      where: { tenantId, sourceRef: bookingNumber, saleNumber: { startsWith: BILL }, status: { not: 'VOIDED' } },
      select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, soldAt: true },
      orderBy: { soldAt: 'desc' },
    });
  }

  private payStatus(paid: number, price: number | null) {
    if (paid <= 0.005) return 'UNPAID';
    return price && paid >= price - 0.005 ? 'PAID' : 'PARTIAL';
  }

  private fields(dto: Body) {
    const out: Record<string, unknown> = {};
    for (const k of ['customerCnic', 'customerAddress', 'animalPreference', 'deliveryAddress', 'charityRecipient', 'cuttingStyle', 'specialInstructions'] as const) {
      if (dto?.[k] !== undefined) out[k] = str(dto[k], 1000);
    }
    if (dto?.deliveryPreference !== undefined) out.deliveryPreference = ['SELF_PICKUP', 'HOME_DELIVERY'].includes(dto.deliveryPreference) ? dto.deliveryPreference : 'SELF_PICKUP';
    for (const k of ['wantsMeatDelivery', 'needsCharityShare', 'wantsSkin', 'wantsOffal'] as const) if (dto?.[k] !== undefined) out[k] = !!dto[k];
    if (dto?.slaughterDay !== undefined) out.slaughterDay = [1, 2, 3].includes(Number(dto.slaughterDay)) ? Number(dto.slaughterDay) : null;
    if (dto?.slaughterDate !== undefined) out.slaughterDate = parseDay(dto.slaughterDate);
    if (dto?.shareNumber !== undefined) out.shareNumber = Number(dto.shareNumber) > 0 ? Math.round(Number(dto.shareNumber)) : null;
    if (dto?.packagingCount !== undefined) out.packagingCount = Number(dto.packagingCount) > 0 ? Math.round(Number(dto.packagingCount)) : null;
    if (dto?.charityShareKg !== undefined) out.charityShareKg = Number(dto.charityShareKg) > 0 ? Number(dto.charityShareKg) : null;
    return out;
  }

  private async animalId(user: AuthenticatedUser, v: unknown) {
    const id = str(v);
    if (!id) return null;
    const a = await this.prisma.meatLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId, isActive: true }, select: { id: true } });
    if (!a) throw new NotFoundException('Janwar nahi mila');
    return a.id;
  }

  private async mustFind(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.meatQurbaniBooking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking nahi mili');
    return b;
  }
}
