import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async customerHistory(user: AuthenticatedUser, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { customerId, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { customer, transactions };
  }

  async leaderboard(user: AuthenticatedUser) {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId: user.tenantId,
        loyaltyPoints: { gt: 0 },
      },
      orderBy: { loyaltyPoints: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        phone: true,
        loyaltyPoints: true,
        totalSpent: true,
      },
    });

    const stats = await this.prisma.loyaltyTransaction.aggregate({
      where: {
        tenantId: user.tenantId,
        type: 'EARNED',
      },
      _sum: { points: true },
    });

    const redeemed = await this.prisma.loyaltyTransaction.aggregate({
      where: {
        tenantId: user.tenantId,
        type: 'REDEEMED',
      },
      _sum: { points: true },
    });

    return {
      topCustomers: customers,
      totalEarned: stats._sum.points ?? 0,
      totalRedeemed: Math.abs(redeemed._sum.points ?? 0),
    };
  }
}
