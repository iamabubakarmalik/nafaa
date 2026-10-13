import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GarmentAlterationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateAlterationDto } from './dto/create-alteration.dto';
import { nextRunningNumber } from '../common/service-sale.helper';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

@Injectable()
export class AlterationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateAlterationDto, activeShopId?: string | null) {
    const ticketNumber = await nextRunningNumber(
      async (prefix) => (await this.prisma.garmentAlterationTicket.findFirst({
        where: { tenantId: user.tenantId, ticketNumber: { startsWith: prefix } },
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      }))?.ticketNumber,
      `ALT-${new Date().getFullYear()}-`,
    );

    return this.prisma.garmentAlterationTicket.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId || activeShopId || user.shopId || null,
        ticketNumber,
        customerId: dto.customerId || null,
        saleId: dto.saleId,
        productId: dto.productId,
        variantId: dto.variantId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        garmentDescription: dto.garmentDescription,
        alterationType: dto.alterationType,
        alterationDetails: dto.alterationDetails,
        priority: dto.priority ?? 'NORMAL',
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
        tailorId: dto.tailorId,
        charges: dto.charges ?? 0,
        beforeImageUrls: dto.beforeImageUrls ?? [],
        notes: dto.notes,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; priority?: string; customerId?: string; tailorId?: string; search?: string }) {
    return this.prisma.garmentAlterationTicket.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.priority && { priority: params.priority as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.tailorId && { tailorId: params.tailorId }),
        ...(params.search && {
          OR: [
            { ticketNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ priority: 'desc' }, { promisedDate: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    status: GarmentAlterationStatus,
    afterImageUrls?: string[],
    paymentMethod?: string,
    paidNow?: number,
  ) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket not found');
    if ((t.status === 'DELIVERED' || t.status === 'CANCELLED') && status !== t.status) {
      throw new BadRequestException(`${t.ticketNumber} pehle hi ${t.status === 'DELIVERED' ? 'deliver' : 'cancel'} ho chuka hai`);
    }
    if (status === t.status) return t;
    const patch: any = { status };
    const now = new Date();
    if (status === 'READY') patch.readyAt = now;
    if (status === 'DELIVERED') patch.deliveredAt = now;
    if (afterImageUrls?.length) patch.afterImageUrls = [...(t.afterImageUrls ?? []), ...afterImageUrls];

    if (status !== 'DELIVERED') {
      return this.prisma.garmentAlterationTicket.update({ where: { id }, data: patch });
    }

    // The alteration charge is earned on delivery and booked as a sale;
    // money taken earlier is already on the customer's khata.
    const total = r2(t.charges);
    const advance = r2(t.paidAmount);
    const due = r2(Math.max(total - advance, 0));
    const takenNow = r2(Math.max(paidNow ?? due, 0));
    const kept = r2(Math.min(takenNow, due));
    const stillOwed = r2(due - kept);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, t.shopId);
      let customerId = t.customerId;
      if (!customerId && stillOwed > 0) {
        if (!t.customerName?.trim()) {
          throw new BadRequestException(`Rs ${stillOwed} baqi hai — poori amount lein, ya udhaar ke liye customer ka naam likhein`);
        }
        customerId = await ensureCustomer(tx, user, { name: t.customerName, phone: t.customerPhone, shopId });
      }
      if (total > 0) {
        const legacyPaid = r2(Math.max(advance - (await paidOnKhata(tx, user.tenantId, t.ticketNumber)), 0));
        await postIndustrySale(tx, user, {
          saleNumber: t.ticketNumber,
          sourceRef: t.ticketNumber,
          shopId,
          customerId,
          lines: [{ label: `Alteration: ${t.garmentDescription} (${t.alterationType})`, amount: total }],
          paidAmount: r2(takenNow + legacyPaid),
          paymentMethod,
        });
      }
      const paid = r2(advance + kept);
      return tx.garmentAlterationTicket.update({
        where: { id },
        data: {
          ...patch,
          shopId,
          customerId,
          paidAmount: paid,
          paymentStatus: paid >= total - 0.01 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        },
      });
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket not found');
    if (t.status === 'DELIVERED' || t.status === 'CANCELLED') {
      throw new BadRequestException(t.status === 'DELIVERED'
        ? 'Ticket deliver ho chuka — baqi amount customer ke khate se wasool karein'
        : 'Cancel shuda ticket par payment nahi li ja sakti');
    }
    const due = r2(Number(t.charges) - Number(t.paidAmount));
    if (amount > due + 0.01) throw new BadRequestException(due > 0 ? `Baqi sirf Rs ${due} hai` : 'Poori amount mil chuki hai');

    return this.prisma.$transaction(async (tx) => {
      // Advance money is held on the customer's khata until delivery.
      const shopId = await resolveIndustryShopId(tx, user, t.shopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: t.customerId, name: t.customerName, phone: t.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: t.ticketNumber, note: `Alteration advance ${t.ticketNumber}`,
      });
      const newPaid = r2(t.paidAmount + amount);
      const paymentStatus = newPaid >= t.charges - 0.01 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
      return tx.garmentAlterationTicket.update({
        where: { id },
        data: { paidAmount: newPaid, paymentStatus, customerId, shopId },
      });
    });
  }
}
