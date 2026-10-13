import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Fields a client may never set directly. */
const LOCKED = ['id', 'tenantId', 'orderNumber', 'createdById', 'createdAt', 'updatedAt', 'paidAmount', 'paymentStatus', 'status', 'deliveredAt'];
const clean = (dto: any) => Object.fromEntries(Object.entries(dto ?? {}).filter(([k]) => !LOCKED.includes(k)));

@Injectable()
export class CustomOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.customerName || !dto.customerPhone) throw new BadRequestException('Customer ka naam aur phone zaroori hai');
    if (!dto.designDescription) throw new BadRequestException('Design ki tafseel likhein');
    const advance = r2(Math.max(Number(dto.advancePayment) || 0, 0));

    const count = await this.prisma.jewelryCustomOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = 'JCO-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    return this.prisma.$transaction(async (tx) => {
      // The advance is cash in hand today: it sits on the customer's khata
      // and is used up by the bill made on delivery.
      let customerId: string | null = dto.customerId || null;
      if (advance > 0) {
        const shopId = await resolveIndustryShopId(tx, user, null);
        customerId = await ensureCustomer(tx, user, { customerId, name: dto.customerName, phone: dto.customerPhone, shopId });
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advance, reference: orderNumber, note: `Zewar order advance ${orderNumber}`,
        });
      }
      return tx.jewelryCustomOrder.create({
        data: {
          tenantId: user.tenantId,
          ...clean(dto),
          customerId,
          assignedKarigarId: dto.assignedKarigarId || null,
          orderNumber,
          status: ['DRAFT', 'QUOTED', 'CONFIRMED'].includes(dto.status) ? dto.status : 'CONFIRMED',
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
          expectedGrossWeight: Number(dto.expectedGrossWeight) || 0,
          expectedNetWeight: dto.expectedNetWeight ? Number(dto.expectedNetWeight) : null,
          expectedMakingCharges: dto.expectedMakingCharges ? Number(dto.expectedMakingCharges) : null,
          advancePayment: advance,
          estimatedPrice: Number(dto.estimatedPrice) || 0,
          paidAmount: advance,
          paymentStatus: advance > 0 ? 'ADVANCE_PAID' : 'UNPAID',
          createdById: user.id,
        } as any,
      });
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; karigarId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.jewelryCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.karigarId && { assignedKarigarId: params.karigarId }),
        ...(params.from || params.to ? {
          orderDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { orderDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.jewelryCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const o = await this.getOne(user, id);
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') throw new BadRequestException('Deliver ya cancel hua order badla nahi ja sakta');
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        ...clean(dto),
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : undefined,
        finalPrice: dto.finalPrice !== undefined ? Number(dto.finalPrice) : undefined,
        expectedGrossWeight: dto.expectedGrossWeight !== undefined ? Number(dto.expectedGrossWeight) : undefined,
        expectedNetWeight: dto.expectedNetWeight !== undefined ? Number(dto.expectedNetWeight) : undefined,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    const o = await this.getOne(user, id);
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') throw new BadRequestException('Yeh order band ho chuka hai');
    if (status === 'DELIVERED') return this.deliver(user, o);
    const patch: any = { status };
    const now = new Date();
    switch (status) {
      case 'DESIGNING': patch.designStartedAt = now; break;
      case 'METAL_ISSUED': patch.metalIssuedDate = now; break;
      case 'IN_PRODUCTION': patch.productionStartedAt = now; break;
      case 'POLISHING': patch.polishingStartedAt = now; break;
      case 'QUALITY_CHECK': patch.qualityCheckedAt = now; break;
      case 'HALLMARKING': patch.hallmarkedAt = now; break;
      case 'READY': patch.readyAt = now; break;
      // The advance stays on the customer's khata as their money; it is returned from there.
      case 'CANCELLED': patch.cancellationReason = reason; break;
    }
    return this.prisma.jewelryCustomOrder.update({ where: { id }, data: patch });
  }

  /** Delivery is the sale: the bill uses the advance on khata, the rest becomes udhaar. */
  private async deliver(user: AuthenticatedUser, o: Awaited<ReturnType<CustomOrdersService['getOne']>>) {
    const price = r2(o.finalPrice ?? o.estimatedPrice);
    if (price <= 0) throw new BadRequestException('Deliver se pehle order ki final qeemat likhein');
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      // Advances taken before khata posting existed count as paid with this bill.
      const legacyPaid = r2(Math.max(o.paidAmount - (await paidOnKhata(tx, user.tenantId, o.orderNumber)), 0));
      let customerId = o.customerId;
      if (!customerId && price > legacyPaid) {
        customerId = await ensureCustomer(tx, user, { name: o.customerName, phone: o.customerPhone, shopId });
      }
      const sale = await postIndustrySale(tx, user, {
        saleNumber: o.orderNumber,
        sourceRef: o.orderNumber,
        shopId,
        customerId,
        lines: [{
          label: `Order zewar: ${o.designDescription.slice(0, 60)}${o.metalReceivedGrams ? ` (${o.metalReceivedGrams}g)` : ''}`,
          amount: price,
        }],
        paidAmount: Math.min(legacyPaid, price),
        paymentMethod: 'CASH',
      });
      return tx.jewelryCustomOrder.update({
        where: { id: o.id },
        data: {
          status: 'DELIVERED', deliveredAt: new Date(), customerId, finalPrice: price,
          paymentStatus: o.paidAmount >= price - 0.01 ? 'PAID' : 'PARTIAL',
          internalNotes: [o.internalNotes, `Bill ${sale.saleNumber}`].filter(Boolean).join(' · '),
        },
      });
    });
  }

  async issueMetal(user: AuthenticatedUser, id: string, grams: number) {
    await this.getOne(user, id);
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        metalIssuedGrams: grams,
        metalIssuedDate: new Date(),
        status: 'METAL_ISSUED',
      },
    });
  }

  async receiveMetal(user: AuthenticatedUser, id: string, receivedGrams: number, wastageGrams: number) {
    await this.getOne(user, id);
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        metalReceivedGrams: receivedGrams,
        metalReceivedDate: new Date(),
        wastageGrams,
      },
    });
  }

  async approveDesign(user: AuthenticatedUser, id: string, designUrl: string) {
    await this.getOne(user, id);
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        approvedDesignUrl: designUrl,
        designApprovedAt: new Date(),
      },
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const o = await this.getOne(user, id);
    const amt = r2(Number(amount) || 0);
    if (amt <= 0) throw new BadRequestException('Raqam sahi likhein');
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') {
      throw new BadRequestException('Order band hai — baqi raqam customer ke Khata se wasool karein');
    }
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      const customerId = await ensureCustomer(tx, user, { customerId: o.customerId, name: o.customerName, phone: o.customerPhone, shopId });
      await recordKhataPayment(tx, user, { customerId, shopId, amount: amt, reference: o.orderNumber, note: `Zewar order advance ${o.orderNumber}` });
      const newPaid = r2(o.paidAmount + amt);
      const target = o.finalPrice ?? o.estimatedPrice;
      const paymentStatus = target && newPaid >= target - 0.01 ? 'PAID' : 'PARTIAL';
      return tx.jewelryCustomOrder.update({ where: { id }, data: { paidAmount: newPaid, paymentStatus, customerId } });
    });
  }

  async rate(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    await this.getOne(user, id);
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: { customerRating: rating, customerFeedback: feedback },
    });
  }
}
