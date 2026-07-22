import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.serviceQuote.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const quoteNumber = 'QT-' + year + '-' + String(count + 1).padStart(4, '0');

    const labour = Number(dto.labourCharge) || 0;
    const parts = Number(dto.partsCharge) || 0;
    const visit = Number(dto.visitCharge) || 0;
    const other = Number(dto.otherCharges) || 0;
    const discount = Number(dto.discount) || 0;
    const tax = Number(dto.taxAmount) || 0;
    const totalAmount = Math.max(labour + parts + visit + other + tax - discount, 0);

    return this.prisma.serviceQuote.create({
      data: {
        tenantId: user.tenantId,
        quoteNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        serviceId: dto.serviceId,
        serviceName: dto.serviceName,
        problemDescription: dto.problemDescription,
        siteVisitRequired: dto.siteVisitRequired ?? false,
        siteVisitCompleted: dto.siteVisitCompleted ?? false,
        status: dto.status ?? 'DRAFT',
        labourCharge: labour,
        partsCharge: parts,
        visitCharge: visit,
        otherCharges: other,
        discount,
        taxAmount: tax,
        totalAmount,
        lineItems: dto.lineItems,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        termsConditions: dto.termsConditions,
        notes: dto.notes,
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; search?: string }) {
    return this.prisma.serviceQuote.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.search && {
          OR: [
            { quoteNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const q = await this.prisma.serviceQuote.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quote not found');
    return q;
  }

  async send(user: AuthenticatedUser, id: string) {
    return this.prisma.serviceQuote.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async accept(user: AuthenticatedUser, id: string) {
    return this.prisma.serviceQuote.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), respondedAt: new Date() },
    });
  }

  async reject(user: AuthenticatedUser, id: string, reason?: string) {
    return this.prisma.serviceQuote.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        respondedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async convertToJob(user: AuthenticatedUser, id: string) {
    const q = await this.prisma.serviceQuote.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!q) throw new NotFoundException('Quote not found');
    if (q.status !== 'ACCEPTED') throw new BadRequestException('Quote must be accepted first');

    const count = await this.prisma.serviceJob.count({ where: { tenantId: user.tenantId } });
    const jobNumber = 'JOB-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    const job = await this.prisma.serviceJob.create({
      data: {
        tenantId: user.tenantId,
        jobNumber,
        customerId: q.customerId,
        customerName: q.customerName,
        customerPhone: q.customerPhone,
        customerEmail: q.customerEmail,
        serviceId: q.serviceId,
        serviceName: q.serviceName,
        problemDescription: q.problemDescription,
        status: 'CONFIRMED',
        labourCharge: q.labourCharge,
        partsCharge: q.partsCharge,
        visitCharge: q.visitCharge,
        discountAmount: q.discount,
        taxAmount: q.taxAmount,
        totalCharge: q.totalAmount,
        createdById: user.id,
      },
    });

    await this.prisma.serviceQuote.update({
      where: { id },
      data: { convertedJobId: job.id },
    });

    return job;
  }
}
