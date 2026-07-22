import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ReorderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze sales history and generate reorder suggestions
   * Formula: If daysOfStock < 7 days AND product actively sold, suggest reorder
   */
  async generateSuggestions(user: AuthenticatedUser) {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Get sales per product in last 30 days
    const salesData = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          soldAt: { gte: thirtyDaysAgo },
        },
      },
      _sum: { quantity: true },
    });

    const productSales = new Map(
      salesData.map((s) => [s.productId, (s._sum.quantity ?? 0) / 30]),
    );

    // Get all active products
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
      },
    });

    // Get last purchase for each product (via PurchaseItem relation)
    const lastPurchaseMap = new Map<string, { costPrice: number; supplierId: string | null }>();
    try {
      const productIds = products.map((p) => p.id);
      if (productIds.length > 0) {
        const purchaseItems = await this.prisma.purchaseItem.findMany({
          where: { productId: { in: productIds } },
          orderBy: { purchase: { createdAt: 'desc' } },
          include: {
            purchase: { select: { supplierId: true, createdAt: true } },
          },
        });
        // Take latest per product
        for (const pi of purchaseItems) {
          if (!lastPurchaseMap.has(pi.productId)) {
            lastPurchaseMap.set(pi.productId, {
              costPrice: pi.costPrice ?? 0,
              supplierId: pi.purchase?.supplierId ?? null,
            });
          }
        }
      }
    } catch {
      // If PurchaseItem model doesn't exist, silently skip
    }

    // Clear old pending suggestions
    await this.prisma.reorderSuggestion.deleteMany({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING',
      },
    });

    const suggestions: any[] = [];

    for (const product of products) {
      const avgDailySales = productSales.get(product.id) ?? 0;
      const daysOfStock = avgDailySales > 0 ? product.stock / avgDailySales : 999;

      // Suggest reorder if:
      // - Product has active sales AND less than 14 days of stock
      // - OR stock is below low stock alert
      const needsReorder =
        (avgDailySales > 0 && daysOfStock < 14) ||
        product.stock <= product.lowStockAlert;

      if (needsReorder) {
        const suggestedQuantity = Math.max(
          Math.ceil(avgDailySales * 30), // 30 days of stock
          product.lowStockAlert * 2,
          10,
        );

        const lastPurchase = lastPurchaseMap.get(product.id);

        suggestions.push({
          tenantId: user.tenantId,
          productId: product.id,
          currentStock: product.stock,
          reorderPoint: product.lowStockAlert,
          suggestedQuantity,
          avgDailySales,
          daysOfStockLeft: daysOfStock,
          lastPurchasePrice: lastPurchase?.costPrice ?? product.costPrice,
          preferredSupplierId: lastPurchase?.supplierId ?? null,
          status: 'PENDING',
        });
      }
    }

    if (suggestions.length > 0) {
      await this.prisma.reorderSuggestion.createMany({ data: suggestions });
    }

    return { generated: suggestions.length };
  }

  async list(user: AuthenticatedUser, status = 'PENDING') {
    return this.prisma.reorderSuggestion.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status !== 'all' && { status }),
      },
      orderBy: [{ daysOfStockLeft: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async listWithProducts(user: AuthenticatedUser, status = 'PENDING') {
    const suggestions = await this.list(user, status);
    const productIds = suggestions.map((s) => s.productId);
    const supplierIds = suggestions
      .map((s) => s.preferredSupplierId)
      .filter(Boolean) as string[];

    const [products, suppliers] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: true,
        },
      }),
      supplierIds.length
        ? this.prisma.supplier.findMany({ where: { id: { in: supplierIds } } })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    return suggestions.map((s) => ({
      ...s,
      product: productMap.get(s.productId),
      supplier: s.preferredSupplierId ? supplierMap.get(s.preferredSupplierId) : null,
    }));
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    return this.prisma.reorderSuggestion.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { status },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.reorderSuggestion.deleteMany({
      where: { id, tenantId: user.tenantId },
    });
  }
}
