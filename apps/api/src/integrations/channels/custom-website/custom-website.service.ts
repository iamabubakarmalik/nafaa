import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../core/integration.service';

@Injectable()
export class CustomWebsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationSvc: IntegrationService,
  ) {}

  async updateOrderStatus(integrationId: string, externalOrderId: string, status: string, paymentStatus?: string) {
    const co = await this.prisma.channelOrder.findUnique({
      where: { integrationId_externalOrderId: { integrationId, externalOrderId } },
    });
    if (!co) throw new NotFoundException('Order not found');

    return this.prisma.channelOrder.update({
      where: { id: co.id },
      data: { orderStatus: status, paymentStatus: paymentStatus ?? co.paymentStatus },
    });
  }

  async getProducts(integration: any, opts: { category?: string; limit: number; offset: number }) {
    const where: any = { tenantId: integration.tenantId, isActive: true };
    if (integration.shopId) where.shopId = integration.shopId;
    if (opts.category) where.category = { name: { contains: opts.category, mode: 'insensitive' } };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        skip: opts.offset,
        select: {
          id: true, name: true, sku: true, price: true,
          description: true, isActive: true,
          images: { select: { url: true }, take: 5 },
          category: { select: { name: true } },
          variants: {
            where: { isActive: true },
            select: { id: true, name: true, price: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: items.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: Number(p.price),
        description: p.description,
        images: p.images.map((i: any) => i.url),
        category: p.category?.name,
        variants: p.variants,
        inStock: p.isActive,
      })),
      total,
      limit: opts.limit,
      offset: opts.offset,
    };
  }
}
