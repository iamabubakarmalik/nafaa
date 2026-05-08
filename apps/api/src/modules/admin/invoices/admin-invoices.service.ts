import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class AdminInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(params: {
    status?: string;
    tenantId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.status) where.status = params.status;

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
      message: `Aap ko Rs ${dto.amount} ka naya invoice mila hai. Due date: ${new Date(dto.dueDate).toLocaleDateString('en-PK')}`,
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
