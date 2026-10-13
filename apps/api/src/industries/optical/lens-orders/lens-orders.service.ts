import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { BookingsService } from '../../../modules/bookings/bookings.service';
import { closeServiceLine, openServiceLine, toPaymentMethod } from '../billing/service-line';
import { CreateLensOrderDto, LensOrderPaymentDto, UpdateLensOrderStatusDto } from './dto/create-lens-order.dto';

const VALID_STATUSES = ['ORDERED', 'SENT_TO_LAB', 'AT_LAB', 'RECEIVED', 'QC_PASSED', 'FITTED', 'READY', 'DELIVERED', 'CANCELLED'];

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

  /** Customer for the booking: the chosen one, else found by phone, else a new one. */
  private async customerFor(user: AuthenticatedUser, shopId: string, dto: CreateLensOrderDto) {
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      return c.id;
    }
    const phone = dto.customerPhone?.trim();
    if (phone) {
      const c = await this.prisma.customer.findFirst({ where: { tenantId: user.tenantId, phone, isActive: true }, select: { id: true } });
      if (c) return c.id;
    }
    const defaults = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { defaultCreditLimit: true } });
    const c = await this.prisma.customer.create({
      data: { tenantId: user.tenantId, shopId, name: dto.customerName.trim(), phone: phone || undefined, creditLimit: defaults?.defaultCreditLimit ?? 0 },
      select: { id: true },
    });
    return c.id;
  }

  /**
   * A lens order is billed through a shared booking: the advance and later
   * payments land in the drawer on the day they are taken, and delivery turns
   * the booking into the sale (frame stock out, revenue in the reports).
   */
  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateLensOrderDto) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);
    const count = await this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    let orderNumber = `LO-${year}-${String(count + 1).padStart(5, '0')}`;
    for (let seq = count + 2; await this.prisma.opticalLensOrder.findFirst({ where: { tenantId: user.tenantId, orderNumber }, select: { id: true } }); seq++) {
      orderNumber = `LO-${year}-${String(seq).padStart(5, '0')}`;
    }

    // Pull prescription values if linked
    let rx: any = null;
    if (dto.prescriptionId) {
      rx = await this.prisma.opticalPrescription.findFirst({
        where: { id: dto.prescriptionId, tenantId: user.tenantId },
      });
      if (!rx) throw new NotFoundException('Prescription not found');
      if (rx.expiryDate && new Date(rx.expiryDate) < new Date()) {
        throw new BadRequestException('Prescription has expired — renew it before ordering lenses');
      }
    }

    const r2 = (v: number) => Math.round(v * 100) / 100;
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
    const customerId = await this.customerFor(user, shopId, dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.opticalLensOrder.create({
        data: {
          tenantId: user.tenantId,
          orderNumber,
          customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          prescriptionId: dto.prescriptionId,
          frameProductId: dto.frameProductId,
          frameName: dto.frameName,
          lensType: dto.lensType,
          lensMaterial: dto.lensMaterial,
          lensIndex: dto.lensIndex,
          lensCoatings: dto.lensCoatings ?? [],
          rightSph: dto.rightSph ?? rx?.rightSph,
          rightCyl: dto.rightCyl ?? rx?.rightCyl,
          rightAxis: dto.rightAxis ?? rx?.rightAxis,
          rightAdd: dto.rightAdd ?? rx?.rightAdd,
          leftSph: dto.leftSph ?? rx?.leftSph,
          leftCyl: dto.leftCyl ?? rx?.leftCyl,
          leftAxis: dto.leftAxis ?? rx?.leftAxis,
          leftAdd: dto.leftAdd ?? rx?.leftAdd,
          pupilDistance: dto.pupilDistance ?? rx?.pupilDistance,
          labName: dto.labName,
          labOrderRef: dto.labOrderRef,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : addDays(new Date(), 7),
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
    const lensLine = await this.prisma.$transaction((tx) => openServiceLine(tx, user, 'LENS', null, 0));
    const items: any[] = [];
    if (framePrice > 0 && frame) {
      items.push({ productId: frame.id, quantity: 1, price: framePrice, costPrice: frame.costPrice ?? 0, note: `${dto.frameName} · ${orderNumber}` });
    } else if (framePrice > 0) {
      items.push({ productId: lensLine, quantity: 1, price: framePrice, costPrice: 0, note: `Frame: ${dto.frameName} · ${orderNumber}` });
    }
    if (lensPrice > 0) {
      items.push({ productId: lensLine, quantity: 1, price: lensPrice, costPrice: 0, note: `Lens: ${dto.lensType}${dto.lensIndex ? ' ' + dto.lensIndex : ''} · ${orderNumber}` });
    }
    if (!items.length) {
      // Fitting only: the booking still needs one line.
      items.push({ productId: lensLine, quantity: 1, price: 0, costPrice: 0, note: `Fitting · ${orderNumber}` });
    }

    let booking: { bookingNumber: string };
    try {
      booking = (await this.bookings.create(user, {
        shopId,
        customerId,
        items,
        serviceCharges: fittingCharge > 0 ? [{ type: 'CUSTOM', label: 'Fitting', amount: fittingCharge }] : undefined,
        initialAdvance: paidAmount || undefined,
        paymentMethod: toPaymentMethod(dto.paymentMethod),
        expectedPickupAt: created.expectedDate?.toISOString(),
        notes: `Chashma order ${orderNumber}`,
        internalNotes: `Lens order ${this.marker(orderNumber)}`,
      } as any)) as any;
    } catch (e) {
      await this.prisma.opticalLensOrder.delete({ where: { id: created.id } }).catch(() => undefined);
      throw e;
    } finally {
      await closeServiceLine(this.prisma, lensLine);
    }

    return this.prisma.opticalLensOrder.update({
      where: { id: created.id },
      data: { notes: [dto.notes, `Booking ${booking.bookingNumber}`].filter(Boolean).join('\n') },
    });
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
        ...(params.overdue && {
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
          expectedDate: { lt: new Date() },
        }),
        ...(params.from || params.to ? {
          orderedAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { frameName: { contains: params.search, mode: 'insensitive' } },
            { labOrderRef: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { orderedAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');

    let prescription = null;
    if (o.prescriptionId) {
      prescription = await this.prisma.opticalPrescription.findUnique({ where: { id: o.prescriptionId } });
    }

    const daysWaiting = Math.floor((Date.now() - new Date(o.orderedAt).getTime()) / 86400000);
    const isOverdue = o.expectedDate ? new Date(o.expectedDate) < new Date() && !['DELIVERED', 'CANCELLED'].includes(o.status) : false;

    return { ...o, prescription, computed: { daysWaiting, isOverdue } };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateLensOrderStatusDto) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');
    if (!VALID_STATUSES.includes(dto.status)) {
      throw new BadRequestException(`Invalid status. Valid: ${VALID_STATUSES.join(', ')}`);
    }
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') {
      throw new BadRequestException('Deliver ya cancel ho chuka order badla nahi ja sakta');
    }
    // Handing over bills the order, so it must go through deliver().
    if (dto.status === 'DELIVERED') return this.deliver(user, id, { fittingNotes: dto.fittingNotes });
    if (dto.status === 'CANCELLED') {
      const booking = await this.bookingFor(user.tenantId, o.orderNumber);
      if (booking && ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'].includes(booking.status)) {
        await this.bookings.cancel(user, booking.id, {
          reason: dto.notes || `Lens order ${o.orderNumber} cancel`,
          refundAdvance: !!dto.refundAdvance,
          refundMethod: dto.refundAdvance ? toPaymentMethod(dto.refundMethod) : undefined,
          managerPin: dto.managerPin,
        } as any);
      }
    }

    const now = new Date();
    const patch: any = { status: dto.status };

    if (dto.status === 'RECEIVED' || dto.status === 'QC_PASSED') patch.receivedAt = o.receivedAt ?? now;
    if (dto.status === 'FITTED') patch.fittedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.labOrderRef) patch.labOrderRef = dto.labOrderRef;
    if (dto.qcNotes) patch.qcNotes = dto.qcNotes;
    if (dto.fittingNotes) patch.fittingNotes = dto.fittingNotes;
    if (dto.notes) patch.notes = ((o.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.opticalLensOrder.update({ where: { id }, data: patch });
  }

  async sendToLab(user: AuthenticatedUser, id: string, body: { labName: string; labOrderRef?: string; expectedDate?: string }) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');

    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        labName: body.labName,
        labOrderRef: body.labOrderRef ?? o.labOrderRef,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : o.expectedDate,
        status: 'SENT_TO_LAB',
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: LensOrderPaymentDto) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');
    if (o.status === 'CANCELLED' || o.status === 'DELIVERED') throw new BadRequestException('Band order par payment nahi li ja sakti');
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!(amount > 0)) throw new BadRequestException('Raqam 0 se zyada honi chahiye');

    const newPaid = Math.round((o.paidAmount + amount) * 100) / 100;
    if (newPaid > o.totalPrice + 0.009) throw new BadRequestException(`Sirf Rs ${o.remainingAmount} baqi hain`);

    const booking = await this.bookingFor(user.tenantId, o.orderNumber);
    if (booking) {
      await this.bookings.addPayment(user, booking.id, { amount, paymentMethod: toPaymentMethod(dto.paymentMethod) } as any);
    }

    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        remainingAmount: Math.max(Math.round((o.totalPrice - newPaid) * 100) / 100, 0),
      },
    });
  }

  async deliver(user: AuthenticatedUser, id: string, body?: { fittingNotes?: string }) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');
    if (o.status === 'DELIVERED') throw new BadRequestException('Order pehle hi de diya gaya hai');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order deliver nahi ho sakta');
    if (o.remainingAmount > 0.009) {
      throw new BadRequestException(`Pehle baqi Rs ${o.remainingAmount} wasool karein, phir order dein`);
    }

    let saleNote = '';
    const booking = await this.bookingFor(user.tenantId, o.orderNumber);
    if (booking && ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'].includes(booking.status)) {
      const lines = await this.prisma.bookingItem.findMany({ where: { bookingId: booking.id }, select: { productId: true, quantity: true } });
      const lensLine = await this.prisma.$transaction(async (tx) => {
        const pid = await openServiceLine(tx, user, 'LENS', null, 0);
        const units = lines.filter((l) => l.productId === pid).reduce((a, l) => a + l.quantity, 0);
        if (units > 0) await openServiceLine(tx, user, 'LENS', booking.shopId, units);
        return pid;
      });
      try {
        const res: any = await this.bookings.convertToSale(user, booking.id, {} as any);
        const saleNumber = res?.sale?.saleNumber ?? res?.saleNumber;
        if (saleNumber) saleNote = `Bill ${saleNumber}`;
      } finally {
        await closeServiceLine(this.prisma, lensLine);
      }
    }

    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        fittedAt: o.fittedAt ?? new Date(),
        fittingNotes: body?.fittingNotes ?? o.fittingNotes,
        ...(saleNote && { notes: [o.notes, saleNote].filter(Boolean).join('\n') }),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');
    if (['FITTED', 'DELIVERED'].includes(o.status)) {
      throw new BadRequestException('Cannot delete a fitted/delivered order');
    }
    const booking = await this.bookingFor(user.tenantId, o.orderNumber);
    if (booking && ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'].includes(booking.status)) {
      if (booking.totalPaid > 0) {
        throw new BadRequestException('Is order par advance liya hua hai — pehle order cancel karein (advance wapsi ke sath)');
      }
      await this.bookings.cancel(user, booking.id, { reason: `Lens order ${o.orderNumber} mitaya`, refundAdvance: false } as any);
    }
    return this.prisma.opticalLensOrder.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const monthStart = startOfMonthTz();

    const [ordered, atLab, received, ready, delivered, overdue, financial] = await Promise.all([
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: 'ORDERED' } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['SENT_TO_LAB', 'AT_LAB'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['RECEIVED', 'QC_PASSED'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['FITTED', 'READY'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.opticalLensOrder.count({
        where: { tenantId: user.tenantId, status: { notIn: ['DELIVERED', 'CANCELLED'] }, expectedDate: { lt: new Date() } },
      }),
      this.prisma.opticalLensOrder.aggregate({
        where: { tenantId: user.tenantId, status: { not: 'CANCELLED' } },
        _sum: { totalPrice: true, paidAmount: true, remainingAmount: true },
      }),
    ]);

    const monthly = await this.prisma.opticalLensOrder.aggregate({
      where: { tenantId: user.tenantId, orderedAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      _sum: { totalPrice: true },
      _count: { _all: true },
    });

    return {
      ordered, atLab, received, ready, delivered, overdue,
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
