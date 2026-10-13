import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/create-quotation.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Line and bill totals. An amount wins when it is above zero, otherwise the
 * percentage applies — the form always sends both fields, so a plain `??`
 * dropped every percentage discount and the tax.
 */
function priceQuotation(dto: CreateQuotationDto) {
  let subtotal = 0;
  const items = dto.items.map((it, idx) => {
    const base = it.quantity * it.unitPrice;
    const discount = Math.min(it.discount ? it.discount : it.discountPct ? (base * it.discountPct) / 100 : 0, base);
    const total = r2(base - discount);
    subtotal += total;
    return { ...it, discount: r2(discount), total, displayOrder: idx };
  });
  subtotal = r2(subtotal);
  const discount = r2(Math.min(dto.discount ? dto.discount : dto.discountPct ? (subtotal * dto.discountPct) / 100 : 0, subtotal));
  const tax = r2(dto.taxAmount ? dto.taxAmount : dto.taxPct ? ((subtotal - discount) * dto.taxPct) / 100 : 0);
  const total = r2(Math.max(subtotal - discount + tax + (dto.deliveryCharges ?? 0) + (dto.laborCharges ?? 0) + (dto.otherCharges ?? 0), 0));
  return { items, subtotal, discount, tax, total };
}

function assertItems(dto: CreateQuotationDto) {
  if (!dto.items?.length) throw new BadRequestException('Kam se kam ek item dalein');
  for (const it of dto.items) {
    if (!(it.quantity > 0)) throw new BadRequestException(`"${it.itemName}" ki quantity 0 se zyada honi chahiye`);
    if (it.unitPrice < 0) throw new BadRequestException(`"${it.itemName}" ka rate manfi nahi ho sakta`);
  }
}

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Links must point at this shop's own project and customer ("" means none). */
  private async cleanLinks(user: AuthenticatedUser, dto: CreateQuotationDto): Promise<CreateQuotationDto> {
    const projectId = dto.projectId?.trim() || undefined;
    const customerId = dto.customerId?.trim() || undefined;
    if (projectId && !(await this.prisma.hardwareProject.findFirst({ where: { id: projectId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Project nahi mila');
    }
    if (customerId && !(await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Customer nahi mila');
    }
    return { ...dto, projectId, customerId, shopId: dto.shopId?.trim() || undefined };
  }

  async create(user: AuthenticatedUser, input: CreateQuotationDto) {
    const dto = await this.cleanLinks(user, input);
    assertItems(dto);
    const { items: enrichedItems, subtotal, discount, tax, total } = priceQuotation(dto);

    const validityDays = dto.validityDays ?? 15;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    const prefix = `QT-${new Date().getFullYear()}-`;
    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.hardwareQuotation.findMany({
        where: { tenantId: user.tenantId, quotationNumber: { startsWith: prefix } },
        select: { quotationNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((q) => q.quotationNumber),
      create: (quotationNumber) => this.prisma.hardwareQuotation.create({
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
    }),
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
    if (dto.status === 'CONVERTED') {
      if (q.status === 'CONVERTED') throw new BadRequestException('Is quotation ka bill pehle ban chuka hai');
      patch.convertedAt = now;
      if (dto.convertedSaleId) {
        const sale = await this.prisma.sale.findFirst({ where: { id: dto.convertedSaleId, tenantId: user.tenantId }, select: { id: true } });
        if (sale) patch.convertedSaleId = sale.id;
      }
    }
    if (dto.notes) patch.internalNotes = ((q.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.hardwareQuotation.update({ where: { id }, data: patch, include: { items: true } });
  }

  async revise(user: AuthenticatedUser, id: string, input: CreateQuotationDto) {
    const dto = await this.cleanLinks(user, input);
    const q = await this.prisma.hardwareQuotation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quotation not found');

    if (q.status === 'CONVERTED') throw new BadRequestException('Bill ban chuki quotation badli nahi ja sakti');
    assertItems(dto);
    const { items: enrichedItems, subtotal, discount, tax, total } = priceQuotation(dto);

    // Items are replaced together with the totals so both always agree.
    const [, updated] = await this.prisma.$transaction([
      this.prisma.hardwareQuotationItem.deleteMany({ where: { quotationId: id } }),
      this.prisma.hardwareQuotation.update({
      where: { id },
      data: {
        projectId: dto.projectId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        customerAddress: dto.customerAddress,
        subtotal,
        discount,
        discountPct: dto.discountPct ?? 0,
        taxAmount: tax,
        taxPct: dto.taxPct ?? 0,
        deliveryCharges: dto.deliveryCharges ?? 0,
        laborCharges: dto.laborCharges ?? 0,
        otherCharges: dto.otherCharges ?? 0,
        paymentTerms: dto.paymentTerms,
        deliveryTerms: dto.deliveryTerms,
        warrantyTerms: dto.warrantyTerms,
        specialTerms: dto.specialTerms,
        customerNotes: dto.customerNotes,
        internalNotes: dto.internalNotes,
        total,
        status: 'REVISED',
        revisionNumber: q.revisionNumber + 1,
        items: { create: enrichedItems },
      },
      include: { items: true },
    }),
    ]);
    return updated;
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
