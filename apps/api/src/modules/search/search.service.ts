import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async global(user: AuthenticatedUser, query: string) {
    if (!query || query.trim().length < 2) {
      return { products: [], customers: [], sales: [], suppliers: [] };
    }

    const q = query.trim();

    const [products, customers, sales, suppliers] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, sku: true, price: true, stock: true, unit: true },
      }),
      this.prisma.customer.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, phone: true, balance: true },
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId: user.tenantId,
          saleNumber: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: {
          id: true,
          saleNumber: true,
          total: true,
          soldAt: true,
          customer: { select: { name: true } },
        },
        orderBy: { soldAt: 'desc' },
      }),
      this.prisma.supplier.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, phone: true },
      }),
    ]);

    return { products, customers, sales, suppliers };
  }
}
