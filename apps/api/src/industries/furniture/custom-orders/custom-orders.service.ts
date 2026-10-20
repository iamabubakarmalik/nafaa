/**
 * Made-to-order furniture: quotation → advance → karigar → ready → delivery.
 * Advances go on the customer's khata the day they come in; the order's bill
 * (FUR-<order>) is written when the furniture leaves the shop and uses those
 * advances first. Orders are cancelled, never deleted.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateCustomOrderDto, RecordPaymentDto, UpdateOrderStatusDto, UpdateProgressDto } from './dto/create-custom-order.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import { ensureCustomer, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { BILLED, billCustomOrder, billTotal, ensureOrderDelivery, orderSaleNumber, r2 } from './order-billing';

/** Still in the shop: the price is agreed or being made. */
const OPEN = ['QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'];

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
      if (!c) throw new NotFoundException('Karigar nahi mila');
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
    if (!o) throw new NotFoundException('Order nahi mila');
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
    from?: string; to?: string; search?: string; page?: number; limit?: number;
  }) {
    const search = params.search?.trim();
    const statuses = (params.status ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    const where: Prisma.FurnitureCustomOrderWhereInput = {
      tenantId: user.tenantId,
      ...(statuses.length === 1 && { status: statuses[0] as any }),
      ...(statuses.length > 1 && { status: { in: statuses as any } }),
      ...(params.customerId && { customerId: params.customerId }),
      ...(params.carpenterId && { carpenterId: params.carpenterId }),
      ...(params.from || params.to ? {
        quotationDate: {
          ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
          ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
        },
      } : {}),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { productType: { contains: search, mode: 'insensitive' } },
          { carpenterName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    if (!params.page) {
      return this.prisma.furnitureCustomOrder.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200 });
    }
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const [items, total] = await Promise.all([
      this.prisma.furnitureCustomOrder.findMany({ where, orderBy: [{ expectedDeliveryDate: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.furnitureCustomOrder.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    const sale = await this.prisma.sale.findFirst({
      where: { tenantId: user.tenantId, saleNumber: orderSaleNumber(o.orderNumber) },
      select: { id: true, saleNumber: true, total: true, creditAmount: true },
    });
    return { ...o, sale };
  }

  async approve(user: AuthenticatedUser, id: string, finalPrice?: number) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.status !== 'QUOTATION') throw new BadRequestException('Sirf quotation approve hoti hai');

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
    if (!o) throw new NotFoundException('Order nahi mila');
    if (['CANCELLED', 'REFUNDED'].includes(o.status)) throw new BadRequestException('Cancel order par payment nahi li ja sakti');
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount 0 se zyada honi chahiye');
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
        method: dto.paymentMethod,
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

  /** Gives the job to a karigar; moving it to another karigar frees the first one. */
  async assignCarpenter(user: AuthenticatedUser, id: string, carpenterId: string, workshopLocation?: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (!OPEN.includes(o.status)) throw new BadRequestException('Ye order workshop se nikal chuka — karigar ab nahi badalta');
    if (!carpenterId) throw new BadRequestException('Karigar chunein');

    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id: carpenterId, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Karigar nahi mila');
    if (!c.isActive) throw new BadRequestException('Ye karigar band hai');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.furnitureCustomOrder.update({
        where: { id },
        data: {
          carpenterId,
          carpenterName: c.name,
          workshopLocation: workshopLocation?.trim() || o.workshopLocation,
          productionStartDate: o.productionStartDate ?? new Date(),
          status: o.status === 'DEPOSIT_PAID' || o.status === 'QUOTATION' ? 'IN_PRODUCTION' : o.status,
        },
      });
      if (o.carpenterId !== carpenterId) {
        await tx.furnitureCarpenter.update({ where: { id: carpenterId }, data: { totalProjects: { increment: 1 }, activeProjects: { increment: 1 } } });
        if (o.carpenterId) await this.freeCarpenter(tx, user.tenantId, o.carpenterId, true);
      }
      return updated;
    });
  }

  /** One job fewer on a karigar's bench (never below zero); `moved` also takes it off his total. */
  private async freeCarpenter(tx: Prisma.TransactionClient, tenantId: string, carpenterId: string, moved = false) {
    await tx.furnitureCarpenter.updateMany({
      where: { id: carpenterId, tenantId, activeProjects: { gt: 0 } },
      data: { activeProjects: { decrement: 1 }, ...(moved && { totalProjects: { decrement: 1 } }) },
    });
  }

  async updateProgress(user: AuthenticatedUser, id: string, dto: UpdateProgressDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (!OPEN.includes(o.status)) throw new BadRequestException('Ye order workshop se nikal chuka');
    const pct = Math.round(Number(dto.progressPct));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new BadRequestException('Kaam 0 se 100% ke beech likhein');

    const photos = [...(o.progressPhotos ?? []), ...(dto.progressPhotos ?? [])].slice(-30);
    const updates = Array.isArray(o.progressUpdates) ? [...(o.progressUpdates as Prisma.JsonArray)] : [];
    const note = dto.updateNote?.trim();
    updates.push({ at: new Date().toISOString(), pct, ...(note && { note: note.slice(0, 300) }) });

    const patch: Prisma.FurnitureCustomOrderUpdateInput = {
      progressPct: pct,
      progressPhotos: photos,
      progressUpdates: updates.slice(-50),
      ...(o.status === 'DEPOSIT_PAID' || o.status === 'QUOTATION' ? { status: 'IN_PRODUCTION', productionStartDate: o.productionStartDate ?? new Date() } : {}),
    };
    if (pct >= 100) {
      patch.productionEndDate = o.productionEndDate ?? new Date();
      patch.status = 'READY_FOR_DELIVERY';
    }
    return this.prisma.furnitureCustomOrder.update({ where: { id }, data: patch });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (['CANCELLED', 'REFUNDED'].includes(o.status)) throw new BadRequestException('Ye order cancel ho chuka hai');
    if (o.status === dto.status) return o;
    if (BILLED.includes(o.status) && !BILLED.includes(dto.status)) {
      throw new BadRequestException('Furniture de diya gaya aur bill ban chuka — ab ye status nahi lag sakta. Wapsi ho to Sales me bill cancel karein');
    }
    if (dto.status === 'REFUNDED') {
      throw new BadRequestException('Return ki amount customer ke khate se dein — order ko Cancel karein');
    }
    if (dto.status === 'CANCELLED' && !dto.cancellationReason?.trim()) throw new BadRequestException('Cancel ki wajah likhein');

    const patch: Prisma.FurnitureCustomOrderUpdateInput = { status: dto.status };
    const now = new Date();

    if (dto.status === 'IN_PRODUCTION' && !o.productionStartDate) patch.productionStartDate = now;
    if (dto.status === 'READY_FOR_DELIVERY') { patch.productionEndDate = o.productionEndDate ?? now; patch.progressPct = 100; }
    if (dto.status === 'CANCELLED') {
      // Any advance stays on the customer's khata as their money; it is returned from there.
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason!.trim().slice(0, 300);
      patch.refundAmount = 0;
    }
    const notes = [o.internalNotes, dto.notes?.trim()].filter(Boolean);

    return this.prisma.$transaction(async (tx) => {
      const billing = BILLED.includes(dto.status) && !BILLED.includes(o.status);
      // Leaving the shop is the sale: the bill uses the advance on khata, the rest becomes udhaar.
      if (billing) {
        Object.assign(patch, await billCustomOrder(tx, user, o));
        notes.push(`Bill ${orderSaleNumber(o.orderNumber)}`);
        if (!o.actualDeliveryDate) patch.actualDeliveryDate = now;
      }
      if (notes.length) patch.internalNotes = notes.join('\n').slice(-2000);

      // Sending it out makes the delivery slip, so it shows on the Deliveries page.
      if (dto.status === 'OUT_FOR_DELIVERY') await ensureOrderDelivery(tx, user, o);

      const updated = await tx.furnitureCustomOrder.update({ where: { id }, data: patch });

      if (o.carpenterId && dto.status === 'CANCELLED') await this.freeCarpenter(tx, user.tenantId, o.carpenterId);
      return updated;
    });
  }

  /** Older screens call delete: an order is cancelled instead, so its advance and history stay. */
  async remove(user: AuthenticatedUser, id: string) {
    return this.updateStatus(user, id, { status: 'CANCELLED', cancellationReason: 'Order hata diya' } as UpdateOrderStatusDto);
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

    const late = await this.prisma.furnitureCustomOrder.count({
      where: { tenantId: user.tenantId, status: { in: OPEN as any }, expectedDeliveryDate: { lt: startOfDayTz() } },
    });
    return {
      quotation, deposit, production, ready, delivered, completed, cancelled, late,
      totalReceivable: receivables._sum.balanceAmount ?? 0,
      totalCollected: receivables._sum.totalPaid ?? 0,
    };
  }

  async overdue(user: AuthenticatedUser) {
    return this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: OPEN as any },
        expectedDeliveryDate: { lt: startOfDayTz() },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });
  }
}
