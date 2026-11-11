import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { apiMessage } from '../../common/i18n/api-message';
import { startOfMonthTz } from '../../common/helpers/business-time.helper';
import { dayRange } from '../common/date-range';

@Injectable()
export class AdminInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Headline numbers for the Invoices page. */
  async stats() {
    const real = { tenant: { slug: { not: 'nafaa-system' } } };
    const now = new Date();
    const [open, overdue, paidMonth, paidCount] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { ...real, status: 'PENDING' }, _sum: { amountDue: true }, _count: true }),
      this.prisma.invoice.aggregate({ where: { ...real, status: 'PENDING', dueDate: { lt: now } }, _sum: { amountDue: true }, _count: true }),
      this.prisma.invoice.aggregate({ where: { ...real, status: 'PAID', paidAt: { gte: startOfMonthTz() } }, _sum: { total: true } }),
      this.prisma.invoice.count({ where: { ...real, status: 'PAID' } }),
    ]);
    return {
      openCount: open._count,
      openAmount: open._sum.amountDue ?? 0,
      overdueCount: overdue._count,
      overdueAmount: overdue._sum.amountDue ?? 0,
      paidThisMonth: paidMonth._sum.total ?? 0,
      paidCount,
    };
  }

  async list(params: {
    status?: string;
    tenantId?: string;
    search?: string;
    overdue?: boolean;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: any = { tenant: { slug: { not: 'nafaa-system' } } };
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.status) where.status = params.status;
    if (params.overdue) {
      where.status = 'PENDING';
      where.dueDate = { lt: new Date() };
    }
    const range = dayRange(params.from, params.to);
    if (range) where.createdAt = range;
    if (params.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { tenant: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          subscription: { include: { plan: { select: { name: true } } } },
          payments: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateInvoiceDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: dto.tenantId,
        invoiceNumber,
        status: 'PENDING',
        subtotal: dto.amount,
        total: dto.amount,
        amountDue: dto.amount,
        description: dto.description,
        notes: dto.notes,
        dueDate: new Date(dto.dueDate),
      },
    });

    await this.notifications.create({
      tenantId: dto.tenantId,
      type: 'INFO',
      title: 'New Invoice 📄',
      message: apiMessage('Aap ko Rs {{amount}} ka naya invoice mila hai. Due date: {{dueDate}}', { amount: dto.amount, dueDate: new Date(dto.dueDate).toLocaleDateString('en-PK') }),
      link: `/billing/invoice/${invoice.id}/pay`,
    });

    return invoice;
  }

  async markPaid(adminUserId: string, id: string, notes?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Already paid');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          tenantId: invoice.tenantId,
          subscriptionId: invoice.subscriptionId,
          invoiceId: invoice.id,
          amount: invoice.amountDue,
          provider: 'CASH',
          status: 'APPROVED',
          payerName: 'Admin Manual Mark Paid',
          notes,
          approvedById: adminUserId,
          approvedAt: new Date(),
          paidAt: new Date(),
        },
      });

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          amountPaid: invoice.total,
          amountDue: 0,
          paidAt: new Date(),
        },
      });

      if (invoice.subscriptionId) {
        await tx.subscription.update({
          where: { id: invoice.subscriptionId },
          data: { status: 'ACTIVE' },
        });
        await tx.tenant.update({
          where: { id: invoice.tenantId },
          data: { status: 'ACTIVE' },
        });
      }

      return updated;
    });
  }

  async voidInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot void paid invoice');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
