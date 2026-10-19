/**
 * Quotes (estimates) given before the work: visit, labour, parts and other
 * lines, sent to the customer, accepted or turned down, and turned into a
 * job card. A quote is never money; the job it becomes takes the advance
 * and the bill.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, QuoteStatus, ServiceQuote } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { JobsService } from '../jobs/jobs.service';
import { blank, nextDocNumber, r2 } from '../jobs/job-rules';
import type { ConvertQuoteDto, ListQuotesQuery, QuoteLineDto, UpsertQuoteDto } from './dto/quote.dto';

export interface StoredLine { kind: QuoteLineDto['kind']; description: string; quantity: number; unitPrice: number; total: number; productId?: string | null }

const EDITABLE: QuoteStatus[] = ['DRAFT', 'SENT', 'REVISED'];

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  private linesOf(q: Pick<ServiceQuote, 'lineItems'>): StoredLine[] {
    return Array.isArray(q.lineItems) ? (q.lineItems as unknown as StoredLine[]) : [];
  }

  private async values(user: AuthenticatedUser, dto: UpsertQuoteDto, prev?: ServiceQuote) {
    const lines: StoredLine[] | undefined = dto.lines?.map((l) => {
      const quantity = Number(l.quantity) > 0 ? Number(l.quantity) : 1;
      const description = l.description?.trim();
      if (!description) throw new BadRequestException('Har line ka naam likhein');
      return { kind: l.kind, description, quantity, unitPrice: r2(l.unitPrice), total: r2(quantity * l.unitPrice), productId: l.productId ?? null };
    });
    const ids = [...new Set((lines ?? []).map((l) => l.productId).filter((x): x is string => !!x))];
    if (ids.length && (await this.prisma.product.count({ where: { tenantId: user.tenantId, id: { in: ids } } })) !== ids.length) {
      throw new NotFoundException('Kuch parts ka product nahi mila');
    }
    const sum = (k: StoredLine['kind']) => r2((lines ?? []).filter((l) => l.kind === k).reduce((s, l) => s + l.total, 0));
    const charges = lines
      ? { visitCharge: sum('VISIT'), labourCharge: sum('LABOUR'), partsCharge: sum('PART'), otherCharges: sum('OTHER') }
      : {
        visitCharge: r2(dto.visitCharge ?? prev?.visitCharge ?? 0), labourCharge: r2(dto.labourCharge ?? prev?.labourCharge ?? 0),
        partsCharge: r2(dto.partsCharge ?? prev?.partsCharge ?? 0), otherCharges: r2(dto.otherCharges ?? prev?.otherCharges ?? 0),
      };
    const discount = r2(dto.discount ?? prev?.discount ?? 0);
    const taxAmount = r2(dto.taxAmount ?? prev?.taxAmount ?? 0);
    const gross = r2(charges.visitCharge + charges.labourCharge + charges.partsCharge + charges.otherCharges + taxAmount);
    if (discount > gross + 0.001) throw new BadRequestException(`Discount quote (Rs ${gross}) se zyada nahi ho sakta`);

    let customerName = blank(dto.customerName) ?? prev?.customerName;
    let customerPhone = blank(dto.customerPhone) ?? prev?.customerPhone;
    const customerId = dto.customerId ?? prev?.customerId ?? null;
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { name: true, phone: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      customerName = customerName ?? c.name;
      customerPhone = customerPhone ?? c.phone ?? undefined;
    }
    if (!customerName) throw new BadRequestException('Customer ka naam likhein');
    let serviceName = blank(dto.serviceName) ?? prev?.serviceName;
    if (dto.serviceId) {
      const svc = await this.prisma.serviceCatalog.findFirst({ where: { id: dto.serviceId, tenantId: user.tenantId }, select: { name: true } });
      if (!svc) throw new NotFoundException('Service nahi mili');
      serviceName = serviceName ?? svc.name;
    }
    if (!serviceName) throw new BadRequestException('Kaam ka naam likhein');
    const validUntil = dto.validUntil !== undefined ? (dto.validUntil ? new Date(dto.validUntil) : null) : prev?.validUntil ?? null;

    return {
      customerId, customerName, customerPhone: customerPhone ?? '', customerEmail: blank(dto.customerEmail) ?? prev?.customerEmail ?? null,
      serviceId: dto.serviceId ?? prev?.serviceId ?? null, serviceName,
      problemDescription: blank(dto.problemDescription) ?? prev?.problemDescription ?? serviceName,
      siteVisitRequired: dto.siteVisitRequired ?? prev?.siteVisitRequired ?? false,
      siteVisitCompleted: dto.siteVisitCompleted ?? prev?.siteVisitCompleted ?? false,
      ...charges, discount, taxAmount, totalAmount: r2(Math.max(gross - discount, 0)),
      ...(lines && { lineItems: lines as unknown as Prisma.InputJsonValue }),
      validUntil,
      termsConditions: dto.termsConditions !== undefined ? blank(dto.termsConditions) ?? null : prev?.termsConditions ?? null,
      notes: dto.notes !== undefined ? blank(dto.notes) ?? null : prev?.notes ?? null,
    };
  }

  async create(user: AuthenticatedUser, dto: UpsertQuoteDto) {
    const data = await this.values(user, dto);
    for (let attempt = 0; ; attempt++) {
      const quoteNumber = await nextDocNumber(async (prefix) => (await this.prisma.serviceQuote.findFirst({
        where: { tenantId: user.tenantId, quoteNumber: { startsWith: prefix } }, orderBy: { quoteNumber: 'desc' }, select: { quoteNumber: true },
      }))?.quoteNumber, 'QT');
      try {
        const q = await this.prisma.serviceQuote.create({ data: { tenantId: user.tenantId, quoteNumber, status: 'DRAFT', createdById: user.id, ...data } });
        return this.shape(q);
      } catch (e) {
        if (attempt < 3 && (e as { code?: string }).code === 'P2002') continue;
        throw e;
      }
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertQuoteDto) {
    const q = await this.find(user, id);
    if (!EDITABLE.includes(q.status)) throw new BadRequestException(`${q.quoteNumber} ${q.status === 'ACCEPTED' ? 'maan liya gaya' : 'band hai'} — badla nahi ja sakta`);
    const data = await this.values(user, dto, q);
    // A quote changed after sending goes back to the customer as revised.
    const status: QuoteStatus = q.status === 'SENT' ? 'REVISED' : q.status;
    return this.shape(await this.prisma.serviceQuote.update({ where: { id }, data: { ...data, status } }));
  }

  private shape(q: ServiceQuote) {
    const expired = !!q.validUntil && q.validUntil.getTime() < Date.now() && EDITABLE.includes(q.status);
    return { ...q, lines: this.linesOf(q), isExpired: expired };
  }

  async list(user: AuthenticatedUser, p: ListQuotesQuery) {
    const now = new Date();
    const view: Prisma.ServiceQuoteWhereInput =
      p.view === 'open' ? { status: { in: EDITABLE }, convertedJobId: null, OR: [{ validUntil: null }, { validUntil: { gte: now } }] }
        : p.view === 'draft' ? { status: 'DRAFT' }
          : p.view === 'sent' ? { status: { in: ['SENT', 'REVISED'] } }
            : p.view === 'accepted' ? { status: 'ACCEPTED', convertedJobId: null }
              : p.view === 'converted' ? { convertedJobId: { not: null } }
                : p.view === 'rejected' ? { status: 'REJECTED' }
                  : p.view === 'expired' ? { status: { in: EDITABLE }, validUntil: { lt: now } }
                    : {};
    const s = p.search?.trim();
    const rows = await this.prisma.serviceQuote.findMany({
      where: {
        tenantId: user.tenantId, ...view,
        ...(p.status && { status: p.status as QuoteStatus }),
        ...(p.customerId && { customerId: p.customerId }),
        ...(s && {
          OR: [
            { quoteNumber: { contains: s, mode: 'insensitive' } },
            { customerName: { contains: s, mode: 'insensitive' } },
            { customerPhone: { contains: s } },
            { serviceName: { contains: s, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return rows.map((q) => this.shape(q));
  }

  private async find(user: AuthenticatedUser, id: string) {
    const q = await this.prisma.serviceQuote.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quote nahi mila');
    return q;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const q = await this.find(user, id);
    const job = q.convertedJobId
      ? await this.prisma.serviceJob.findFirst({ where: { id: q.convertedJobId, tenantId: user.tenantId }, select: { id: true, jobNumber: true, status: true } })
      : null;
    return { ...this.shape(q), job };
  }

  async send(user: AuthenticatedUser, id: string) {
    const q = await this.find(user, id);
    if (!EDITABLE.includes(q.status)) throw new BadRequestException('Ye quote bheja nahi ja sakta');
    return this.shape(await this.prisma.serviceQuote.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } }));
  }

  async accept(user: AuthenticatedUser, id: string) {
    const q = await this.find(user, id);
    if (!EDITABLE.includes(q.status)) throw new BadRequestException(`${q.quoteNumber} pehle hi ${q.status === 'ACCEPTED' ? 'maan liya gaya' : 'band hai'}`);
    const now = new Date();
    return this.shape(await this.prisma.serviceQuote.update({ where: { id }, data: { status: 'ACCEPTED', acceptedAt: now, respondedAt: now } }));
  }

  async reject(user: AuthenticatedUser, id: string, reason?: string) {
    const q = await this.find(user, id);
    if (!EDITABLE.includes(q.status)) throw new BadRequestException('Ye quote band hai');
    const now = new Date();
    return this.shape(await this.prisma.serviceQuote.update({ where: { id }, data: { status: 'REJECTED', rejectedAt: now, respondedAt: now, rejectionReason: blank(reason) ?? null } }));
  }

  /**
   * Turns the quote into a job card with the same charges; part lines
   * become job parts (shelf parts leave stock when the job is billed).
   * Converting an open quote also marks it accepted.
   */
  async convertToJob(user: AuthenticatedUser, id: string, dto: ConvertQuoteDto = {}) {
    const q = await this.find(user, id);
    if (q.convertedJobId) throw new BadRequestException('Is quote ka job pehle hi ban chuka hai');
    if (q.status === 'REJECTED' || q.status === 'EXPIRED') throw new BadRequestException('Mana kiya hua quote job nahi banta — naya quote banayein');
    const lines = this.linesOf(q);
    const parts = lines.filter((l) => l.kind === 'PART');
    const job = await this.jobs.create(user, {
      shopId: dto.shopId, customerId: q.customerId ?? undefined, customerName: q.customerName, customerPhone: q.customerPhone || undefined,
      customerEmail: q.customerEmail ?? undefined, serviceId: q.serviceId ?? undefined, serviceName: q.serviceName,
      problemDescription: q.problemDescription, scheduledStart: dto.scheduledStart, primaryTechnicianId: dto.primaryTechnicianId,
      visitCharge: q.visitCharge, labourCharge: q.labourCharge, transportCharge: q.otherCharges, discountAmount: q.discount, taxAmount: q.taxAmount,
      parts: parts.length
        ? parts.map((p) => ({ productId: p.productId ?? undefined, partName: p.description, quantity: p.quantity, unitPrice: p.unitPrice }))
        : q.partsCharge > 0 ? [{ partName: 'Parts (quote ke mutabiq)', quantity: 1, unitPrice: q.partsCharge }] : [],
      internalNotes: `Quote ${q.quoteNumber} se`,
    });
    const now = new Date();
    await this.prisma.serviceQuote.update({
      where: { id },
      data: { convertedJobId: job.id, ...(q.status !== 'ACCEPTED' && { status: 'ACCEPTED', acceptedAt: now, respondedAt: now }) },
    });
    return job;
  }
}
