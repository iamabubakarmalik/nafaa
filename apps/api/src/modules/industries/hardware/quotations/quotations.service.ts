import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/create-quotation.dto';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateQuotationDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    const count = await this.prisma.hardwareQuotation.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${String(count + 1).padStart(4, '0')}`;

    // Calculate item totals
    let subtotal = 0;
    const enrichedItems = dto.items.map((it, idx) => {
      const base = it.quantity * it.unitPrice;
      const discount = it.discount ?? (it.discountPct ? (base * it.discountPct) / 100 : 0);
      const total = Math.max(base - discount, 0);
      subtotal += total;
      return { ...it, discount, total, displayOrder: idx };
    });

    const discount = dto.discount ?? (dto.discountPct ? (subtotal * dto.discountPct) / 100 : 0);
    const tax = dto.taxAmount ?? (dto.taxPct ? ((subtotal - discount) * dto.taxPct) / 100 : 0);
    const total = Math.max(subtotal - discount + tax + (dto.deliveryCharges ?? 0) + (dto.laborCharges ?? 0) + (dto.otherCharges ?? 0), 0);

    const validityDays = dto.validityDays ?? 15;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    return this.prisma.hardwareQuotation.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        quotationNumber,
        projectId: dto.projectId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        customerAddress: dto.customerAddress,
        validityDays,
        validUntil,
        subtotal,
        discount,
        discountPct: dto.discountPct ?? 0,
        taxAmount: tax,
        taxPct: dto.taxPct ?? 0,
        deliveryCharges: dto.deliveryCharges ?? 0,
        laborCharges: dto.laborCharges ?? 0,
        otherCharges: dto.otherCharges ?? 0,
        total,
        paymentTerms: dto.paymentTerms,
        deliveryTerms: dto.deliveryTerms,
        warrantyTerms: dto.warrantyTerms,
        specialTerms: dto.specialTerms,
        customerNotes: dto.customerNotes,
        internalNotes: dto.internalNotes,
        attachmentUrls: dto.attachmentUrls ?? [],
        createdById: user.id,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; projectId?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.hardwareQuotation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.projectId && { projectId: params.projectId }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to ? {
          createdAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { quotationNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      include: { items: { take: 3 }, project: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const q = await this.prisma.hardwareQuotation.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } }, project: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateQuotationStatusDto) {
    const q = await this.prisma.hardwareQuotation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quotation not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'SENT') patch.sentAt = now;
    if (dto.status === 'VIEWED') patch.viewedAt = now;
    if (dto.status === 'ACCEPTED' || dto.status === 'REJECTED') patch.respondedAt = now;
    if (dto.status === 'CONVERTED') patch.convertedAt = now;
    if (dto.notes) patch.internalNotes = ((q.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.hardwareQuotation.update({ where: { id }, data: patch, include: { items: true } });
  }

  async revise(user: AuthenticatedUser, id: string, dto: CreateQuotationDto) {
    const q = await this.prisma.hardwareQuotation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quotation not found');

    // Delete existing items, then update
    await this.prisma.hardwareQuotationItem.deleteMany({ where: { quotationId: id } });

    let subtotal = 0;
    const enrichedItems = dto.items.map((it, idx) => {
      const base = it.quantity * it.unitPrice;
      const discount = it.discount ?? (it.discountPct ? (base * it.discountPct) / 100 : 0);
      const total = Math.max(base - discount, 0);
      subtotal += total;
      return { ...it, discount, total, displayOrder: idx };
    });

    const discount = dto.discount ?? 0;
    const tax = dto.taxAmount ?? 0;
    const total = Math.max(subtotal - discount + tax + (dto.deliveryCharges ?? 0) + (dto.laborCharges ?? 0) + (dto.otherCharges ?? 0), 0);

    return this.prisma.hardwareQuotation.update({
      where: { id },
      data: {
        subtotal,
        discount,
        taxAmount: tax,
        total,
        status: 'REVISED',
        revisionNumber: q.revisionNumber + 1,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const q = await this.prisma.hardwareQuotation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quotation not found');
    return this.prisma.hardwareQuotation.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [total, accepted, pending, expired] = await Promise.all([
      this.prisma.hardwareQuotation.count({ where: { tenantId: user.tenantId } }),
      this.prisma.hardwareQuotation.aggregate({ where: { tenantId: user.tenantId, status: 'ACCEPTED' }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.hardwareQuotation.count({ where: { tenantId: user.tenantId, status: { in: ['SENT', 'VIEWED'] } } }),
      this.prisma.hardwareQuotation.count({ where: { tenantId: user.tenantId, status: 'EXPIRED' } }),
    ]);

    return {
      totalQuotations: total,
      acceptedCount: accepted._count._all,
      acceptedValue: accepted._sum.total ?? 0,
      pendingCount: pending,
      expiredCount: expired,
    };
  }
}
