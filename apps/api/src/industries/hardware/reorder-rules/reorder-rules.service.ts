import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertReorderRuleDto } from './dto/upsert-reorder-rule.dto';

@Injectable()
export class ReorderRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertReorderRuleDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.hardwareReorderRule.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.hardwareReorderRule.update({
        where: { productId: dto.productId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.hardwareReorderRule.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; needsReorder?: boolean }) {
    const rules = await this.prisma.hardwareReorderRule.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!params.needsReorder) return rules.map((r) => ({ ...r, needsReorder: false, currentStock: 0 }));

    const productIds = rules.map((r) => r.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return rules
      .map((rule) => {
        const product = productsMap.get(rule.productId);
        const currentStock = product?.stock ?? 0;
        const needsReorder = currentStock <= rule.reorderPoint;
        const stockDeficit = Math.max(rule.reorderPoint - currentStock, 0);
        return { ...rule, product, currentStock, needsReorder, stockDeficit };
      })
      .filter((r) => !params.needsReorder || r.needsReorder);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.hardwareReorderRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rule not found');

    const product = await this.prisma.product.findFirst({
      where: { id: r.productId },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    return { ...r, product, currentStock: product?.stock ?? 0 };
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.hardwareReorderRule.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.hardwareReorderRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rule not found');
    return this.prisma.hardwareReorderRule.update({ where: { id }, data: { isActive: false } });
  }

  async lowStockAlert(user: AuthenticatedUser) {
    const rules = await this.prisma.hardwareReorderRule.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });

    const productIds = rules.map((r) => r.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    const alerts = rules
      .map((r) => {
        const p = productsMap.get(r.productId);
        const stock = p?.stock ?? 0;
        return {
          ...r,
          product: p,
          currentStock: stock,
          severity: stock <= 0 ? 'OUT_OF_STOCK' : stock <= r.minStock ? 'CRITICAL' : stock <= r.reorderPoint ? 'LOW' : 'OK',
        };
      })
      .filter((a) => a.severity !== 'OK')
      .sort((a, b) => {
        const order = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2 };
        return (order as any)[a.severity] - (order as any)[b.severity];
      });

    return {
      total: alerts.length,
      outOfStock: alerts.filter((a) => a.severity === 'OUT_OF_STOCK').length,
      critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
      low: alerts.filter((a) => a.severity === 'LOW').length,
      alerts,
    };
  }

  async markAlerted(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.hardwareReorderRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rule not found');
    return this.prisma.hardwareReorderRule.update({ where: { id }, data: { lastAlertAt: new Date() } });
  }
}
