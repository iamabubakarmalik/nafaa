import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class CustomerLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const ledgers = await this.prisma.customerLedger.findMany({
      where: { customerId, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      take: 100,
    });

    return { customer, ledgers };
  }

  async receivePayment(
    user: AuthenticatedUser,
    customerId: string,
    dto: CreatePaymentDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    if (customer.balance <= 0) {
      throw new BadRequestException('Customer ka koi balance nahi hai');
    }

    if (dto.amount > customer.balance) {
      throw new BadRequestException(
        `Customer ka balance sirf ${customer.balance} hai`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const newBalance = customer.balance - dto.amount;

      const updated = await tx.customer.update({
        where: { id: customer.id },
        data: { balance: newBalance },
      });

      const ledger = await tx.customerLedger.create({
        data: {
          tenantId: user.tenantId,
          customerId: customer.id,
          createdById: user.id,
          type: 'PAYMENT_RECEIVED',
          amount: -dto.amount,
          balanceAfter: newBalance,
          reference: dto.reference,
          note: dto.note || 'Payment received',
        },
      });

      return { customer: updated, ledger };
    });
  }

  async summary(user: AuthenticatedUser) {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId: user.tenantId,
        balance: { gt: 0 },
      },
      orderBy: { balance: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        creditLimit: true,
      },
      take: 20,
    });

    const totalCredit = await this.prisma.customer.aggregate({
      where: { tenantId: user.tenantId },
      _sum: { balance: true },
      _count: { _all: true },
    });

    const customersWithCredit = await this.prisma.customer.count({
      where: {
        tenantId: user.tenantId,
        balance: { gt: 0 },
      },
    });

    return {
      totalOutstanding: totalCredit._sum.balance ?? 0,
      totalCustomers: totalCredit._count._all,
      customersWithCredit,
      topDebtors: customers,
    };
  }
}
