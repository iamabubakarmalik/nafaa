import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateCustomOrderDto, RecordPaymentDto, UpdateOrderStatusDto, UpdateProgressDto } from './dto/create-custom-order.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import { ensureCustomer, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { BILLED, billCustomOrder, billTotal, ensureOrderDelivery, orderSaleNumber, r2 } from './order-billing';

@Injectable()
export class CustomOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, input: CreateCustomOrderDto) {
    const dto = { ...input, customerId: input.customerId?.trim() || undefined, carpenterId: input.carpenterId?.trim() || undefined };
    if (!(dto.quotedPrice > 0)) throw new BadRequestException('Qeemat 0 se zyada honi chahiye');
    if (!(dto.estimatedDays > 0)) throw new BadRequestException('Kitne din lagenge, likhein');
    if ((dto.depositAmount ?? 0) < 0) throw new BadRequestException('Advance manfi nahi ho sakta');
    if (dto.customerId && !(await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Customer nahi mila');
    }

    let carpenterName: string | undefined;
    if (dto.carpenterId) {
      const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id: dto.carpenterId, tenantId: user.tenantId } });
      if (!c) throw new NotFoundException('Carpenter nahi mila');
      carpenterName = c.name;
    }

    // `depositAmount` is the advance asked for; money counts as paid only when
    // it is received through "payment", which also puts it on the khata.
    const depositAmount = r2(dto.depositAmount ?? 0);
    const expectedDeliveryDate = addDays(new Date(), dto.estimatedDays);
    const prefix = `FCO-${new Date().getFullYear()}-`;

    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.furnitureCustomOrder.findMany({
        where: { tenantId: user.tenantId, orderNumber: { startsWith: prefix } },
        select: { orderNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((o) => o.orderNumber),
      create: (orderNumber) => this.prisma.furnitureCustomOrder.create({
        data: {
          tenantId: user.tenantId,
          orderNumber,
          ...dto,
          sketchUrls: dto.sketchUrls ?? [],
          referenceImages: dto.referenceImages ?? [],
          carpenterName,
          depositAmount,
          totalPaid: 0,
          balanceAmount: billTotal({ finalPrice: null, quotedPrice: dto.quotedPrice, requiresInstallation: dto.requiresInstallation ?? true, installationCharge: dto.installationCharge ?? null }),
          expectedDeliveryDate,
          status: 'QUOTATION',
          createdById: user.id,
        },
      }),
    });
  }

  /** Details can change until the furniture leaves; the price only while it is a quotation. */
  async update(user: AuthenticatedUser, id: string, input: CreateCustomOrderDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (BILLED.includes(o.status) || ['CANCELLED', 'REFUNDED'].includes(o.status)) {
      throw new BadRequestException('Ye order band ho chuka — ab badla nahi ja sakta');
    }
    const { quotedPrice, depositAmount, estimatedDays, carpenterId, customerId, installationCharge, requiresInstallation, ...rest } = input;
    const priceOpen = o.status === 'QUOTATION';
    const next = {
      quotedPrice: priceOpen ? quotedPrice : o.quotedPrice,
      installationCharge: priceOpen ? installationCharge ?? null : o.installationCharge,
      requiresInstallation: priceOpen ? requiresInstallation ?? o.requiresInstallation : o.requiresInstallation,
    };
    if (!(next.quotedPrice > 0)) throw new BadRequestException('Qeemat 0 se zyada honi chahiye');
    return this.prisma.furnitureCustomOrder.update({
      where: { id },
      data: {
        ...rest,
        ...next,
        depositAmount: priceOpen ? r2(depositAmount ?? o.depositAmount) : o.depositAmount,
        estimatedDays: estimatedDays > 0 ? estimatedDays : o.estimatedDays,
        expectedDeliveryDate: estimatedDays > 0 && estimatedDays !== o.estimatedDays ? addDays(o.quotationDate, estimatedDays) : undefined,
        balanceAmount: r2(Math.max(billTotal({ ...next, finalPrice: o.finalPrice }) - o.totalPaid, 0)),
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; carpenterId?: string;
    from?: string; to?: string; search?: string;
  }) {
    return this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.carpenterId && { carpenterId: params.carpenterId }),
        ...(params.from || params.to ? {
          quotationDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { productType: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Custom order not found');
    const sale = await this.prisma.sale.findFirst({
      where: { tenantId: user.tenantId, saleNumber: orderSaleNumber(o.orderNumber) },
      select: { id: true, saleNumber: true, total: true, creditAmount: true },
    });
    return { ...o, sale };
  }

  async approve(user: AuthenticatedUser, id: string, finalPrice?: number) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.status !== 'QUOTATION') throw new BadRequestException('Only quotations can be approved');

    const price = finalPrice ?? o.quotedPrice;
    if (!(price > 0)) throw new BadRequestException('Qeemat 0 se zyada honi chahiye');
    return this.prisma.furnitureCustomOrder.update({
      where: { id },
      data: {
        finalPrice: price,
        balanceAmount: r2(Math.max(billTotal({ ...o, finalPrice: price }) - o.totalPaid, 0)),
        approvedDate: new Date(),
        status: o.depositPaid ? 'IN_PRODUCTION' : 'DEPOSIT_PAID',
      },
    });
  }

  /**
   * Money received for an order. Before delivery it is an advance on the
   * customer's khata; after delivery it pays off the order's udhaar. Either
   * way the day book and cash register see the cash on the day it came in.
   */
  async recordPayment(user: AuthenticatedUser, id: string, dto: RecordPaymentDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (['CANCELLED', 'REFUNDED'].includes(o.status)) throw new BadRequestException('Cancel order par payment nahi li ja sakti');
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Raqam 0 se zyada honi chahiye');
    const total = billTotal(o);
    const remaining = r2(total - o.totalPaid);
    if (amount > remaining + 0.01) throw new BadRequestException(`Sirf Rs ${Math.max(remaining, 0)} baqi hai`);
    const billed = BILLED.includes(o.status);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      const customerId = await ensureCustomer(tx, user, {
        customerId: o.customerId, name: o.customerName, phone: o.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId,
        shopId,
        amount,
        reference: billed ? orderSaleNumber(o.orderNumber) : o.orderNumber,
        note: billed
          ? `Furniture order ${o.orderNumber} ki wusooli${dto.reference ? ` (${dto.reference})` : ''}`
          : `Furniture order ${o.orderNumber} ka advance${dto.reference ? ` (${dto.reference})` : ''}`,
      });

      const newTotalPaid = r2(o.totalPaid + amount);
      const patch: any = {
        customerId,
        totalPaid: newTotalPaid,
        balanceAmount: r2(Math.max(total - newTotalPaid, 0)),
      };
      if (!o.depositPaid && (dto.isDeposit || (o.depositAmount > 0 && newTotalPaid >= o.depositAmount - 0.01))) {
        patch.depositPaid = true;
        if (o.status === 'QUOTATION') patch.status = 'DEPOSIT_PAID';
      }
      return tx.furnitureCustomOrder.update({ where: { id }, data: patch });
    });
  }

  async assignCarpenter(user: AuthenticatedUser, id: string, carpenterId: string, workshopLocation?: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id: carpenterId, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Carpenter not found');
    if (!c.isActive) throw new BadRequestException('Carpenter not active');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.furnitureCustomOrder.update({
        where: { id },
        data: {
          carpenterId,
          carpenterName: c.name,
          workshopLocation: workshopLocation ?? o.workshopLocation,
          productionStartDate: o.productionStartDate ?? new Date(),
          status: o.status === 'DEPOSIT_PAID' ? 'IN_PRODUCTION' : o.status,
        },
      });
      await tx.furnitureCarpenter.update({
        where: { id: carpenterId },
        data: {
          totalProjects: { increment: 1 },
          activeProjects: { increment: 1 },
        },
      });
      return updated;
    });
  }

  async updateProgress(user: AuthenticatedUser, id: string, dto: UpdateProgressDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const photos = [...(o.progressPhotos ?? []), ...(dto.progressPhotos ?? [])];
    const updates = (o.progressUpdates as any[]) ?? [];
    if (dto.updateNote) {
      updates.push({ at: new Date().toISOString(), pct: dto.progressPct, note: dto.updateNote });
    }

    const patch: any = {
      progressPct: Math.max(0, Math.min(100, dto.progressPct)),
      progressPhotos: photos,
      progressUpdates: updates,
    };

    if (dto.progressPct >= 100 && !o.productionEndDate) {
      patch.productionEndDate = new Date();
      patch.status = 'READY_FOR_DELIVERY';
    }

    return this.prisma.furnitureCustomOrder.update({ where: { id }, data: patch });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (['CANCELLED', 'REFUNDED'].includes(o.status)) throw new BadRequestException('Ye order cancel ho chuka hai');
    if (BILLED.includes(o.status) && !BILLED.includes(dto.status)) {
      throw new BadRequestException('Furniture de diya gaya aur bill ban chuka — ab ye status nahi lag sakta');
    }
    if (dto.status === 'REFUNDED') {
      throw new BadRequestException('Wapsi ki raqam customer ke khate se dein — order ko Cancel karein');
    }

    const patch: any = { status: dto.status };
    const now = new Date();

    if (dto.status === 'DELIVERED' && !o.actualDeliveryDate) patch.actualDeliveryDate = now;
    if (dto.status === 'CANCELLED') {
      // Any advance stays on the customer's khata as their money; it is returned from there.
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
      patch.refundAmount = 0;
    }
    if (dto.notes) patch.internalNotes = ((o.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.$transaction(async (tx) => {
      // Leaving the shop is the sale: the bill uses the advance on khata, the rest becomes udhaar.
      if (BILLED.includes(dto.status) && !BILLED.includes(o.status)) {
        Object.assign(patch, await billCustomOrder(tx, user, o));
        patch.internalNotes = [patch.internalNotes ?? o.internalNotes, `Bill ${orderSaleNumber(o.orderNumber)}`].filter(Boolean).join('\n');
        if (!o.actualDeliveryDate) patch.actualDeliveryDate = now;
      }

      // Sending it out makes the delivery slip, so it shows on the Deliveries page.
      if (dto.status === 'OUT_FOR_DELIVERY') await ensureOrderDelivery(tx, user, o);

      const updated = await tx.furnitureCustomOrder.update({ where: { id }, data: patch });

      if (dto.status === 'COMPLETED' && o.status !== 'COMPLETED' && o.carpenterId) {
        await tx.furnitureCarpenter.update({
          where: { id: o.carpenterId },
          data: {
            completedProjects: { increment: 1 },
            activeProjects: { decrement: 1 },
            totalRevenue: { increment: o.finalPrice ?? o.quotedPrice },
          },
        });
      }
      return updated;
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (['IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(o.status)) {
      throw new BadRequestException(`Cannot delete order in status ${o.status}`);
    }
    if (o.totalPaid > 0) throw new BadRequestException('Is order par advance liya gaya hai — delete ke bajaye Cancel karein');
    return this.prisma.furnitureCustomOrder.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [quotation, deposit, production, ready, delivered, completed, cancelled] = await Promise.all([
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'QUOTATION' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'DEPOSIT_PAID' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'IN_PRODUCTION' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_DELIVERY' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'CANCELLED' } }),
    ]);

    const receivables = await this.prisma.furnitureCustomOrder.aggregate({
      where: { tenantId: user.tenantId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { balanceAmount: true, totalPaid: true },
    });

    return {
      quotation, deposit, production, ready, delivered, completed, cancelled,
      totalReceivable: receivables._sum.balanceAmount ?? 0,
      totalCollected: receivables._sum.totalPaid ?? 0,
    };
  }

  async overdue(user: AuthenticatedUser) {
    return this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['IN_PRODUCTION', 'DEPOSIT_PAID'] },
        expectedDeliveryDate: { lt: new Date() },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });
  }
}
