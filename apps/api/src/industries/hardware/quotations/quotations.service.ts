import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HardwareQuotationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/create-quotation.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Quotations still waiting for the customer; past their date they count as expired. */
const OPEN: HardwareQuotationStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'REVISED'];
const TABS = ['all', 'open', 'accepted', 'converted', 'expired', 'rejected'] as const;
type QuotationTab = (typeof TABS)[number];

/** Which statuses each status may move to by hand; CONVERTED is set only with a bill. */
const NEXT: Partial<Record<HardwareQuotationStatus, HardwareQuotationStatus[]>> = {
  DRAFT: ['SENT', 'ACCEPTED', 'REJECTED'],
  SENT: ['VIEWED', 'ACCEPTED', 'REJECTED', 'DRAFT'],
  VIEWED: ['ACCEPTED', 'REJECTED'],
  REVISED: ['SENT', 'ACCEPTED', 'REJECTED'],
  ACCEPTED: ['REJECTED', 'SENT'],
  EXPIRED: ['SENT', 'ACCEPTED', 'REJECTED'],
  REJECTED: ['SENT'],
};

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
    const productIds = [...new Set(dto.items.map((i) => i.productId?.trim()).filter((x): x is string => !!x))];
    if (productIds.length) {
      const found = await this.prisma.product.count({ where: { tenantId: user.tenantId, id: { in: productIds } } });
      if (found !== productIds.length) throw new NotFoundException('Quotation ka koi product is dukaan ka nahi');
    }
    const items = dto.items.map((i) => ({ ...i, itemName: i.itemName?.trim(), productId: i.productId?.trim() || undefined, variantId: i.variantId?.trim() || undefined }));
    if (items.some((i) => !i.itemName)) throw new BadRequestException('Har item ka naam likhein');
    if (!dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');
    return { ...dto, items, customerName: dto.customerName.trim(), projectId, customerId, shopId: dto.shopId?.trim() || undefined };
  }

  async create(user: AuthenticatedUser, scope: ShopScope, input: CreateQuotationDto) {
    const dto = await this.cleanLinks(user, { ...input, shopId: input.shopId || scope.shopId || undefined });
    assertItems(dto);
    if (dto.validityDays != null && !(dto.validityDays >= 1 && dto.validityDays <= 365)) throw new BadRequestException('Quotation 1 se 365 din tak chal sakti hai');
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

  private baseWhere(user: AuthenticatedUser, scope: ShopScope, q: { search?: string; from?: string; to?: string; projectId?: string; customerId?: string }): Prisma.HardwareQuotationWhereInput {
    const search = q.search?.trim();
    return {
      tenantId: user.tenantId,
      ...scope.whereLoose,
      ...(q.projectId && { projectId: q.projectId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.from || q.to ? { createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
      ...(search && {
        OR: [
          { quotationNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { items: { some: { itemName: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
    };
  }

  private tabWhere(tab: QuotationTab, now: Date): Prisma.HardwareQuotationWhereInput {
    switch (tab) {
      case 'open': return { status: { in: OPEN }, validUntil: { gte: now } };
      case 'accepted': return { status: 'ACCEPTED' };
      case 'converted': return { status: 'CONVERTED' };
      case 'expired': return { OR: [{ status: 'EXPIRED' }, { status: { in: OPEN }, validUntil: { lt: now } }] };
      case 'rejected': return { status: 'REJECTED' };
      default: return {};
    }
  }

  /** Open quotations past their date show as expired without a write. */
  private shown<T extends { status: HardwareQuotationStatus; validUntil: Date }>(q: T, now: Date): T {
    return OPEN.includes(q.status) && q.validUntil < now ? { ...q, status: 'EXPIRED' as HardwareQuotationStatus } : q;
  }

  /** Server-side list: one page, counts per tab and the value of open and accepted quotations. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: { tab?: string; search?: string; from?: string; to?: string; projectId?: string; customerId?: string; page?: number; limit?: number }) {
    const now = new Date();
    const tab: QuotationTab = (TABS as readonly string[]).includes(q.tab ?? '') ? (q.tab as QuotationTab) : 'all';
    const limit = Math.min(Math.max(Number(q.limit) || 25, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const base = this.baseWhere(user, scope, q);
    const where = { AND: [base, this.tabWhere(tab, now)] };
    const [items, total, openValue, acceptedValue, convertedValue, ...counts] = await Promise.all([
      this.prisma.hardwareQuotation.findMany({
        where,
        include: { items: { orderBy: { displayOrder: 'asc' }, take: 4 }, project: { select: { id: true, name: true, projectNumber: true } }, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.hardwareQuotation.count({ where }),
      this.prisma.hardwareQuotation.aggregate({ where: { AND: [base, this.tabWhere('open', now)] }, _sum: { total: true } }),
      this.prisma.hardwareQuotation.aggregate({ where: { AND: [base, this.tabWhere('accepted', now)] }, _sum: { total: true } }),
      this.prisma.hardwareQuotation.aggregate({ where: { AND: [base, this.tabWhere('converted', now)] }, _sum: { total: true } }),
      ...TABS.map((t) => this.prisma.hardwareQuotation.count({ where: { AND: [base, this.tabWhere(t, now)] } })),
    ]);
    return {
      items: items.map((x) => this.shown(x, now)),
      total,
      page,
      limit,
      counts: Object.fromEntries(TABS.map((t, i) => [t, counts[i]])) as Record<QuotationTab, number>,
      values: { open: r2(openValue._sum.total ?? 0), accepted: r2(acceptedValue._sum.total ?? 0), converted: r2(convertedValue._sum.total ?? 0) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const q = await this.prisma.hardwareQuotation.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } }, project: true },
    });
    if (!q) throw new NotFoundException('Quotation nahi mili');
    const sale = q.convertedSaleId
      ? await this.prisma.sale.findFirst({ where: { id: q.convertedSaleId, tenantId: user.tenantId }, select: { id: true, saleNumber: true, status: true } })
      : null;
    return { ...this.shown(q, new Date()), sale };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateQuotationStatusDto) {
    const q = await this.prisma.hardwareQuotation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quotation nahi mili');
    if (q.status === 'CONVERTED') throw new BadRequestException('Is quotation ka bill ban chuka hai');

    const patch: Prisma.HardwareQuotationUpdateInput = { status: dto.status };
    const now = new Date();
    if (dto.status === 'CONVERTED') {
      // Billing is the only way to convert, so the quotation always points at its bill.
      const sale = dto.convertedSaleId
        ? await this.prisma.sale.findFirst({ where: { id: dto.convertedSaleId, tenantId: user.tenantId }, select: { id: true, status: true } })
        : null;
      if (!sale) throw new BadRequestException('Bill nahi mila — quotation bill banne par hi "Bill ban gaya" hoti hai');
      if (sale.status === 'VOIDED') throw new BadRequestException('Void bill se quotation band nahi hoti');
      patch.convertedAt = now;
      patch.convertedSaleId = sale.id;
    } else if (!NEXT[q.status]?.includes(dto.status)) {
      throw new BadRequestException('Quotation is haalat se aage nahi badal sakti');
    }
    if (dto.status === 'SENT') {
      patch.sentAt = now;
      // Sending again after the date runs out starts a fresh validity period.
      if (q.validUntil < now) patch.validUntil = new Date(now.getTime() + q.validityDays * 86_400_000);
    }
    if (dto.status === 'VIEWED') patch.viewedAt = now;
    if (dto.status === 'ACCEPTED' || dto.status === 'REJECTED') patch.respondedAt = now;
    if (dto.notes?.trim()) patch.internalNotes = ((q.internalNotes || '') + '\n' + dto.notes.trim()).trim();

    await this.prisma.hardwareQuotation.update({ where: { id }, data: patch });
    return this.getOne(user, id);
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
        ...(dto.validityDays && { validityDays: dto.validityDays, validUntil: new Date(Date.now() + dto.validityDays * 86_400_000) }),
        items: { create: enrichedItems },
      },
      include: { items: true },
    }),
    ]);
    return updated;
  }

  /** A quotation is a record sent to a customer: "delete" closes it as rejected and keeps it. */
  async remove(user: AuthenticatedUser, id: string) {
    const q = await this.prisma.hardwareQuotation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quotation nahi mili');
    if (q.status === 'CONVERTED') throw new BadRequestException('Bill ban chuki quotation band nahi hoti');
    if (q.status === 'REJECTED') return this.getOne(user, id);
    await this.prisma.hardwareQuotation.update({
      where: { id },
      data: { status: 'REJECTED', respondedAt: new Date(), internalNotes: ((q.internalNotes || '') + '\nBand ki gayi').trim() },
    });
    return this.getOne(user, id);
  }

  async summary(user: AuthenticatedUser, scope: ShopScope) {
    const now = new Date();
    const base = { tenantId: user.tenantId, ...scope.whereLoose };
    const [total, accepted, pending, expired] = await Promise.all([
      this.prisma.hardwareQuotation.count({ where: base }),
      this.prisma.hardwareQuotation.aggregate({ where: { ...base, status: 'ACCEPTED' }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.hardwareQuotation.count({ where: { AND: [base, this.tabWhere('open', now)] } }),
      this.prisma.hardwareQuotation.count({ where: { AND: [base, this.tabWhere('expired', now)] } }),
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
