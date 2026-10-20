import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { addDaysTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { BookingsService } from '../../../modules/bookings/bookings.service';
import { ensureCustomer } from '../../_shared/industry-sale.helper';
import { closeServiceLine, openServiceLine, toPaymentMethod } from '../billing/service-line';
import { checkEyePower, nextNumber, pageArgs, r2, type PageArgs } from '../common/optical-common';
import { CreateLensOrderDto, DeliverLensOrderDto, LensOrderPaymentDto, SendToLabDto, UpdateLensOrderStatusDto } from './dto/create-lens-order.dto';

const VALID_STATUSES = ['ORDERED', 'SENT_TO_LAB', 'AT_LAB', 'RECEIVED', 'QC_PASSED', 'FITTED', 'READY', 'DELIVERED', 'CANCELLED'];
const CLOSED = ['DELIVERED', 'CANCELLED'];
const BOOKING_OPEN = ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'];
/** A repair job rides on the order flow with this lens type. */
export const REPAIR = 'REPAIR';

export type LensOrderView = 'open' | 'lab' | 'ready' | 'late' | 'unpaid' | 'repairs' | 'delivered' | 'cancelled' | 'all';

@Injectable()
export class LensOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
  ) {}

  /** Marker written on the booking so an order can find its booking again. */
  private marker(orderNumber: string) {
    return `[${orderNumber}]`;
  }

  /** The shared booking that carries this order's money (null for old orders). */
  private async bookingFor(tenantId: string, orderNumber: string) {
    return this.prisma.booking.findFirst({
      where: { tenantId, internalNotes: { contains: this.marker(orderNumber) } },
      select: { id: true, bookingNumber: true, status: true, shopId: true, totalPaid: true, balanceDue: true, total: true },
    });
  }

  /**
   * A lens order is billed through a shared booking: the advance and later
   * payments land in the drawer on the day they are taken, and delivery turns
   * the booking into the sale (frame stock out, revenue in the reports).
   */
  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateLensOrderDto) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);
    const repair = dto.lensType === REPAIR;
    const count = await this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = await nextNumber(repair ? 'RP' : 'LO', count, async (n) =>
      !!(await this.prisma.opticalLensOrder.findFirst({ where: { tenantId: user.tenantId, orderNumber: n }, select: { id: true } })));

    // Pull prescription values if linked
    let rx: any = null;
    if (dto.prescriptionId) {
      rx = await this.prisma.opticalPrescription.findFirst({
        where: { id: dto.prescriptionId, tenantId: user.tenantId },
      });
      if (!rx) throw new NotFoundException('Prescription nahi mila');
      if (!rx.isActive) throw new BadRequestException('Ye prescription band hai — naya ya renew wala chunein');
      if (rx.expiryDate && new Date(rx.expiryDate) < new Date()) {
        throw new BadRequestException('Prescription ki muddat khatam — pehle renew karein');
      }
    }
    const power = {
      rightSph: dto.rightSph ?? rx?.rightSph, rightCyl: dto.rightCyl ?? rx?.rightCyl, rightAxis: dto.rightAxis ?? rx?.rightAxis, rightAdd: dto.rightAdd ?? rx?.rightAdd,
      leftSph: dto.leftSph ?? rx?.leftSph, leftCyl: dto.leftCyl ?? rx?.leftCyl, leftAxis: dto.leftAxis ?? rx?.leftAxis, leftAdd: dto.leftAdd ?? rx?.leftAdd,
      pupilDistance: dto.pupilDistance ?? rx?.pupilDistance,
    };
    checkEyePower(power);
    if (!dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');
    if ((dto.customerPhone ?? '').replace(/\D/g, '').length < 10) throw new BadRequestException('Sahi mobile number likhein (03xx-xxxxxxx)');
    const framePrice = r2(Math.max(dto.framePrice ?? 0, 0));
    const lensPrice = r2(Math.max(dto.lensPrice ?? 0, 0));
    const fittingCharge = r2(Math.max(dto.fittingCharge ?? 0, 0));
    const totalPrice = r2(framePrice + lensPrice + fittingCharge);
    const paidAmount = r2(Math.max(dto.paidAmount ?? 0, 0));
    if (!(totalPrice > 0)) throw new BadRequestException('Order ki qeemat 0 se zyada honi chahiye');
    if (paidAmount > totalPrice + 0.009) throw new BadRequestException('Advance kul qeemat se zyada nahi ho sakta');

    const frame = dto.frameProductId
      ? await this.prisma.product.findFirst({ where: { id: dto.frameProductId, tenantId: user.tenantId, isActive: true }, select: { id: true, costPrice: true } })
      : null;
    if (dto.frameProductId && !frame) throw new NotFoundException('Frame product nahi mila');
    const customerId = await ensureCustomer(this.prisma, user, { customerId: dto.customerId, name: dto.customerName, phone: dto.customerPhone, shopId });
    const expectedDate = dto.expectedDate ? new Date(dto.expectedDate) : addDaysTz(new Date(), repair ? 2 : 7);
    if (Number.isNaN(expectedDate.getTime())) throw new BadRequestException('Tayyari ki date sahi nahi');

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.opticalLensOrder.create({
        data: {
          tenantId: user.tenantId,
          orderNumber,
          customerId,
          customerName: dto.customerName.trim(),
          customerPhone: dto.customerPhone.trim(),
          prescriptionId: dto.prescriptionId,
          frameProductId: dto.frameProductId,
          frameName: dto.frameName,
          lensType: dto.lensType,
          lensMaterial: dto.lensMaterial,
          lensIndex: dto.lensIndex,
          lensCoatings: dto.lensCoatings ?? [],
          ...power,
          labName: dto.labName,
          labOrderRef: dto.labOrderRef,
          expectedDate,
          framePrice, lensPrice, fittingCharge, totalPrice,
          paidAmount,
          remainingAmount: Math.max(r2(totalPrice - paidAmount), 0),
          status: 'ORDERED',
          notes: dto.notes,
        },
      });
      if (dto.prescriptionId) {
        await tx.opticalPrescription.update({
          where: { id: dto.prescriptionId },
          data: { timesUsed: { increment: 1 } },
        });
      }
      return order;
    });

    // Frame from stock is a real product line; lenses (and a frame not kept in
    // stock) ride on the lens service line; fitting is a service charge.
    const lensLine = await this.prisma.$transaction((tx) => openServiceLine(tx, user, 'LENS'));
    const items: any[] = [];
    if (framePrice > 0 && frame) {
      items.push({ productId: frame.id, quantity: 1, price: framePrice, costPrice: frame.costPrice ?? 0, note: `${dto.frameName} · ${orderNumber}` });
    } else if (framePrice > 0) {
      items.push({ productId: lensLine, quantity: 1, price: framePrice, costPrice: 0, note: `Frame: ${dto.frameName} · ${orderNumber}` });
    }
    if (lensPrice > 0) {
      const what = repair ? 'Repair' : `Lens: ${dto.lensType}${dto.lensIndex ? ' ' + dto.lensIndex : ''}`;
      items.push({ productId: lensLine, quantity: 1, price: lensPrice, costPrice: dto.lensCost ? r2(Math.max(dto.lensCost, 0)) : 0, note: `${what} · ${orderNumber}` });
    }
    if (!items.length) {
      // Fitting only: the booking still needs one line.
      items.push({ productId: lensLine, quantity: 1, price: 0, costPrice: 0, note: `${repair ? 'Repair' : 'Fitting'} · ${orderNumber}` });
    }

    let booking: { bookingNumber: string };
    try {
      booking = (await this.bookings.create(user, {
        shopId,
        customerId,
        items,
        serviceCharges: fittingCharge > 0 ? [{ type: 'CUSTOM', label: repair ? 'Repair' : 'Fitting', amount: fittingCharge }] : undefined,
        initialAdvance: paidAmount || undefined,
        paymentMethod: toPaymentMethod(dto.paymentMethod),
        expectedPickupAt: created.expectedDate?.toISOString(),
        notes: `${repair ? 'Chashma repair' : 'Chashma order'} ${orderNumber}`,
        internalNotes: `Lens order ${this.marker(orderNumber)}`,
      } as any)) as any;
    } catch (e) {
      // No money was taken: the order is closed, not removed.
      await this.prisma.opticalLensOrder.update({
        where: { id: created.id },
        data: { status: 'CANCELLED', paidAmount: 0, remainingAmount: 0, notes: [dto.notes, 'Booking nahi bani — order band'].filter(Boolean).join('\n') },
      }).catch(() => undefined);
      throw e;
    } finally {
      await closeServiceLine(this.prisma, lensLine);
    }

    return this.prisma.opticalLensOrder.update({
      where: { id: created.id },
      data: { notes: [dto.notes, `Booking ${booking.bookingNumber}`].filter(Boolean).join('\n') },
    });
  }

  private searchWhere(search?: string): Prisma.OpticalLensOrderWhereInput {
    const q = search?.trim();
    if (!q) return {};
    return {
      OR: [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { frameName: { contains: q, mode: 'insensitive' } },
        { labName: { contains: q, mode: 'insensitive' } },
        { labOrderRef: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; labName?: string;
    pendingPayment?: boolean; overdue?: boolean;
    from?: string; to?: string; search?: string;
  }) {
    return this.prisma.opticalLensOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.labName && { labName: { contains: params.labName, mode: 'insensitive' } }),
        ...(params.pendingPayment && { remainingAmount: { gt: 0 } }),
        ...(params.overdue && { status: { notIn: CLOSED }, expectedDate: { lt: startOfDayTz() } }),
        ...(params.from || params.to ? {
          orderedAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...this.searchWhere(params.search),
      },
      orderBy: [{ status: 'asc' }, { orderedAt: 'desc' }],
      take: 200,
    });
  }

  private viewWhere(view: LensOrderView): Prisma.OpticalLensOrderWhereInput {
    switch (view) {
      case 'open': return { status: { notIn: CLOSED } };
      case 'lab': return { status: { in: ['ORDERED', 'SENT_TO_LAB', 'AT_LAB'] } };
      case 'ready': return { status: { in: ['RECEIVED', 'QC_PASSED', 'FITTED', 'READY'] } };
      case 'late': return { status: { notIn: CLOSED }, expectedDate: { lt: startOfDayTz() } };
      case 'unpaid': return { status: { notIn: ['CANCELLED'] }, remainingAmount: { gt: 0.009 } };
      case 'repairs': return { lensType: REPAIR };
      case 'delivered': return { status: 'DELIVERED' };
      case 'cancelled': return { status: 'CANCELLED' };
      default: return {};
    }
  }

  /** One page of orders for a desk view, with the money in that view. */
  async page(user: AuthenticatedUser, q: PageArgs & { view?: string; search?: string; from?: string; to?: string; customerId?: string }) {
    const { page, limit, skip } = pageArgs(q);
    const view = (q.view ?? 'open') as LensOrderView;
    const where: Prisma.OpticalLensOrderWhereInput = {
      tenantId: user.tenantId,
      ...this.viewWhere(view),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.from || q.to ? { orderedAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
      ...this.searchWhere(q.search),
    };
    const late = ['late', 'open', 'lab'].includes(view);
    const [items, total, sums] = await Promise.all([
      this.prisma.opticalLensOrder.findMany({
        where, skip, take: limit,
        orderBy: late ? [{ expectedDate: 'asc' }, { orderedAt: 'desc' }] : [{ orderedAt: 'desc' }],
      }),
      this.prisma.opticalLensOrder.count({ where }),
      this.prisma.opticalLensOrder.aggregate({ where, _sum: { totalPrice: true, paidAmount: true, remainingAmount: true } }),
    ]);
    return {
      items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)),
      totals: { value: r2(sums._sum.totalPrice ?? 0), paid: r2(sums._sum.paidAmount ?? 0), due: r2(sums._sum.remainingAmount ?? 0) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');

    const [prescription, booking] = await Promise.all([
      o.prescriptionId ? this.prisma.opticalPrescription.findFirst({ where: { id: o.prescriptionId, tenantId: user.tenantId } }) : null,
      this.bookingFor(user.tenantId, o.orderNumber),
    ]);
    const sale = booking ? await this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, bookingId: booking.id }, select: { id: true, saleNumber: true, status: true, total: true } }) : null;

    const daysWaiting = Math.floor((Date.now() - new Date(o.orderedAt).getTime()) / 86400000);
    const isOverdue = !!o.expectedDate && new Date(o.expectedDate) < startOfDayTz() && !CLOSED.includes(o.status);

    return { ...o, prescription, booking, sale, computed: { daysWaiting, isOverdue, isRepair: o.lensType === REPAIR } };
  }

  private async load(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateLensOrderStatusDto) {
    const o = await this.load(user, id);
    if (!VALID_STATUSES.includes(dto.status)) throw new BadRequestException('Ye halat nahi chalti');
    if (CLOSED.includes(o.status)) throw new BadRequestException('Deliver ya cancel ho chuka order badla nahi ja sakta');
    // Handing over bills the order, so it must go through deliver().
    if (dto.status === 'DELIVERED') throw new BadRequestException('Dene ke liye "Customer ko dein" use karein — wahan bill banta hai');
    const booking = await this.bookingFor(user.tenantId, o.orderNumber);
    if (dto.status === 'CANCELLED') {
      if (booking && BOOKING_OPEN.includes(booking.status)) {
        if (booking.totalPaid > 0 && dto.refundAdvance === undefined) {
          throw new BadRequestException('Advance liya hua hai — batayein wapas karna hai ya nahi');
        }
        await this.bookings.cancel(user, booking.id, {
          reason: dto.notes || `Order ${o.orderNumber} cancel`,
          refundAdvance: !!dto.refundAdvance,
          refundMethod: dto.refundAdvance ? toPaymentMethod(dto.refundMethod) : undefined,
          managerPin: dto.managerPin,
        } as any);
      }
    } else if (booking) {
      // Keep the shared booking's "ready for pickup" in step with the order.
      const ready = ['FITTED', 'READY'].includes(dto.status);
      if (ready && ['PENDING', 'ADVANCE_PAID'].includes(booking.status)) await this.bookings.markReady(user, booking.id, true).catch(() => undefined);
      if (!ready && booking.status === 'READY_FOR_PICKUP') await this.bookings.markReady(user, booking.id, false).catch(() => undefined);
    }

    const now = new Date();
    const patch: Prisma.OpticalLensOrderUpdateInput = { status: dto.status };
    if (dto.status === 'RECEIVED' || dto.status === 'QC_PASSED') patch.receivedAt = o.receivedAt ?? now;
    if (dto.status === 'FITTED' || dto.status === 'READY') { patch.receivedAt = o.receivedAt ?? now; patch.fittedAt = o.fittedAt ?? now; }
    // A cancelled order owes nothing; an advance handed back is no longer held.
    if (dto.status === 'CANCELLED') patch.remainingAmount = 0;
    if (dto.status === 'CANCELLED' && booking && dto.refundAdvance) patch.paidAmount = 0;
    if (dto.labOrderRef) patch.labOrderRef = dto.labOrderRef;
    if (dto.qcNotes) patch.qcNotes = dto.qcNotes;
    if (dto.fittingNotes) patch.fittingNotes = dto.fittingNotes;
    if (dto.notes) patch.notes = [o.notes, dto.notes].filter(Boolean).join('\n');
    if (dto.status === 'CANCELLED') patch.notes = [o.notes, dto.notes, dto.refundAdvance ? `Advance Rs ${o.paidAmount} wapas` : o.paidAmount > 0 ? `Advance Rs ${o.paidAmount} khata me jama` : null].filter(Boolean).join('\n');

    return this.prisma.opticalLensOrder.update({ where: { id }, data: patch });
  }

  async sendToLab(user: AuthenticatedUser, id: string, body: SendToLabDto) {
    const o = await this.load(user, id);
    if (CLOSED.includes(o.status)) throw new BadRequestException('Band order lab nahi ja sakta');
    const expectedDate = body.expectedDate ? new Date(body.expectedDate) : o.expectedDate;
    if (expectedDate && Number.isNaN(expectedDate.getTime())) throw new BadRequestException('Tayyari ki date sahi nahi');
    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        labName: body.labName.trim(),
        labOrderRef: body.labOrderRef?.trim() || o.labOrderRef,
        expectedDate,
        status: 'SENT_TO_LAB',
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: LensOrderPaymentDto) {
    const o = await this.load(user, id);
    if (CLOSED.includes(o.status)) throw new BadRequestException('Band order par payment nahi li ja sakti');
    const amount = r2(Number(dto.amount));
    if (!(amount > 0)) throw new BadRequestException('Amount 0 se zyada honi chahiye');
    const newPaid = r2(o.paidAmount + amount);
    if (newPaid > o.totalPrice + 0.009) throw new BadRequestException(`Sirf Rs ${o.remainingAmount} baqi hain`);

    const booking = await this.bookingFor(user.tenantId, o.orderNumber);
    if (!booking || !BOOKING_OPEN.includes(booking.status)) throw new BadRequestException('Is order ki booking nahi mili — payment counter par bill se lein');
    await this.bookings.addPayment(user, booking.id, { amount, paymentMethod: toPaymentMethod(dto.paymentMethod), notes: `Order ${o.orderNumber}` } as any);

    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: { paidAmount: newPaid, remainingAmount: Math.max(r2(o.totalPrice - newPaid), 0) },
    });
  }

  /**
   * Hands the glasses over: the booking becomes the bill (frame stock out,
   * revenue in the reports). Money taken now is added; what is still unpaid
   * goes on the customer's khata only when the counter says so.
   */
  async deliver(user: AuthenticatedUser, id: string, body: DeliverLensOrderDto = {}) {
    const o = await this.load(user, id);
    if (o.status === 'DELIVERED') throw new BadRequestException('Order pehle hi de diya gaya hai');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order deliver nahi ho sakta');
    const pay = r2(Math.max(Number(body.payment) || 0, 0));
    if (pay > o.remainingAmount + 0.009) throw new BadRequestException(`Sirf Rs ${o.remainingAmount} baqi hain`);
    const credit = r2(Math.max(o.remainingAmount - pay, 0));
    if (credit > 0 && !body.onKhata) {
      throw new BadRequestException(`Rs ${credit} baqi hain — poore lein ya "Baqi khata me" chunein`);
    }

    const booking = await this.bookingFor(user.tenantId, o.orderNumber);
    if (!booking) throw new BadRequestException('Is order ki booking nahi mili — counter par bill banayein');
    if (!BOOKING_OPEN.includes(booking.status)) throw new BadRequestException('Is order ki booking band hai');

    // The lens line is a service product, so the booking bill takes no stock for it.
    const lensLine = await this.prisma.$transaction((tx) => openServiceLine(tx, user, 'LENS'));
    let saleNumber: string | undefined;
    try {
      const res: any = await this.bookings.convertToSale(user, booking.id, {
        additionalPayment: pay || undefined,
        paymentMethod: pay > 0 ? toPaymentMethod(body.paymentMethod) : undefined,
        notes: pay > 0 ? `Order ${o.orderNumber} dete waqt` : undefined,
      } as any);
      saleNumber = res?.sale?.saleNumber;
    } finally {
      await closeServiceLine(this.prisma, lensLine);
    }

    const now = new Date();
    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: now,
        receivedAt: o.receivedAt ?? now,
        fittedAt: o.fittedAt ?? now,
        paidAmount: r2(o.paidAmount + pay),
        remainingAmount: credit,
        fittingNotes: body.fittingNotes?.trim() || o.fittingNotes,
        notes: [o.notes, saleNumber && `Bill ${saleNumber}`, credit > 0 && `Rs ${credit} khata me`].filter(Boolean).join('\n'),
      },
    });
  }

  /** Orders are never removed: one with no money taken is cancelled. */
  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.load(user, id);
    if (CLOSED.includes(o.status)) throw new BadRequestException('Order pehle hi band hai');
    if (o.paidAmount > 0) throw new BadRequestException('Is order par advance liya hua hai — cancel karte waqt batayein advance wapas karna hai ya nahi');
    return this.updateStatus(user, id, { status: 'CANCELLED', notes: 'Order hataya' });
  }

  /** Bills from delivered orders, for the sales history: sale id → order. */
  async forSales(user: AuthenticatedUser, saleIds: string[]) {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, id: { in: saleIds.slice(0, 200) }, bookingId: { not: null } },
      select: { id: true, booking: { select: { internalNotes: true } } },
    });
    const numbers = new Map<string, string>();
    for (const s of sales) {
      const m = /\[((?:LO|RP)-\d{4}-\d+)\]/.exec(s.booking?.internalNotes ?? '');
      if (m) numbers.set(m[1], s.id);
    }
    if (!numbers.size) return {};
    const orders = await this.prisma.opticalLensOrder.findMany({
      where: { tenantId: user.tenantId, orderNumber: { in: [...numbers.keys()] } },
      select: { id: true, orderNumber: true, lensType: true, status: true },
    });
    return Object.fromEntries(orders.map((o) => [numbers.get(o.orderNumber)!, { id: o.id, number: o.orderNumber, repair: o.lensType === REPAIR, status: o.status }]));
  }

  /** A voided or fully returned delivery bill closes its order; the shared void already settled money and stock. */
  async onBillUndone(tenantId: string, saleId: string, why: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId, bookingId: { not: null } }, select: { saleNumber: true, booking: { select: { internalNotes: true } } } });
    const m = /\[((?:LO|RP)-\d{4}-\d+)\]/.exec(sale?.booking?.internalNotes ?? '');
    if (!sale || !m) return;
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { tenantId, orderNumber: m[1], status: 'DELIVERED' } });
    if (!o) return;
    await this.prisma.opticalLensOrder.update({
      where: { id: o.id },
      data: { status: 'CANCELLED', remainingAmount: 0, notes: [o.notes, `Bill ${sale.saleNumber} ${why} — order band`].filter(Boolean).join('\n') },
    });
  }

  async summary(user: AuthenticatedUser) {
    const monthStart = startOfMonthTz();

    const [ordered, atLab, received, ready, delivered, overdue, financial, repairsOpen, dueToday] = await Promise.all([
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: 'ORDERED' } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['SENT_TO_LAB', 'AT_LAB'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['RECEIVED', 'QC_PASSED'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['FITTED', 'READY'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.opticalLensOrder.count({
        where: { tenantId: user.tenantId, status: { notIn: CLOSED }, expectedDate: { lt: startOfDayTz() } },
      }),
      this.prisma.opticalLensOrder.aggregate({
        where: { tenantId: user.tenantId, status: { notIn: CLOSED } },
        _sum: { totalPrice: true, paidAmount: true, remainingAmount: true },
      }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, lensType: REPAIR, status: { notIn: CLOSED } } }),
      this.prisma.opticalLensOrder.count({
        where: { tenantId: user.tenantId, status: { notIn: CLOSED }, expectedDate: { gte: startOfDayTz(), lt: addDaysTz(startOfDayTz(), 1) } },
      }),
    ]);

    const monthly = await this.prisma.opticalLensOrder.aggregate({
      where: { tenantId: user.tenantId, orderedAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      _sum: { totalPrice: true },
      _count: { _all: true },
    });

    return {
      ordered, atLab, received, ready, delivered, overdue, repairsOpen, dueToday,
      totalBilled: financial._sum.totalPrice ?? 0,
      totalCollected: financial._sum.paidAmount ?? 0,
      totalReceivable: financial._sum.remainingAmount ?? 0,
      monthlyOrders: monthly._count._all,
      monthlyValue: monthly._sum.totalPrice ?? 0,
    };
  }

  async labPerformance(user: AuthenticatedUser) {
    const rows = await this.prisma.opticalLensOrder.groupBy({
      by: ['labName'],
      where: { tenantId: user.tenantId, labName: { not: null } },
      _count: { _all: true },
      _sum: { lensPrice: true },
    });

    const withDelays = await Promise.all(
      rows.map(async (r) => {
        const delivered = await this.prisma.opticalLensOrder.findMany({
          where: { tenantId: user.tenantId, labName: r.labName, receivedAt: { not: null } },
          select: { orderedAt: true, receivedAt: true, expectedDate: true },
          take: 100,
        });
        const turnarounds = delivered
          .filter((d) => d.receivedAt)
          .map((d) => (new Date(d.receivedAt!).getTime() - new Date(d.orderedAt).getTime()) / 86400000);
        const avgDays = turnarounds.length ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : 0;
        const lateCount = delivered.filter((d) => d.expectedDate && d.receivedAt && new Date(d.receivedAt) > new Date(d.expectedDate)).length;

        return {
          labName: r.labName,
          totalOrders: r._count._all,
          lensRevenue: r._sum.lensPrice ?? 0,
          avgTurnaroundDays: Number(avgDays.toFixed(1)),
          lateDeliveries: lateCount,
          onTimePct: delivered.length ? Number((((delivered.length - lateCount) / delivered.length) * 100).toFixed(1)) : 100,
        };
      }),
    );

    return withDelays.sort((a, b) => b.totalOrders - a.totalOrders);
  }
}
