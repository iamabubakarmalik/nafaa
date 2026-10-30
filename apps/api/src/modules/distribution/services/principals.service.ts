/**
 * Principals: the companies (suppliers) whose brands the distributor
 * carries. A brand belongs to at most one principal (DistPrincipalBrand);
 * a product's principal is its brand's. Claims, targets and commission by
 * principal all read this one mapping.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

type Db = Prisma.TransactionClient | PrismaService;

/** Principal (supplier id) of each product, through its brand. Products without one are left out. */
export async function principalOfProducts(db: Db, tenantId: string, productIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const products = await db.product.findMany({ where: { tenantId, id: { in: ids }, brandId: { not: null } }, select: { id: true, brandId: true } });
  const links = await db.distPrincipalBrand.findMany({
    where: { tenantId, brandId: { in: [...new Set(products.map((p) => p.brandId!))] } },
    select: { brandId: true, supplierId: true },
  });
  const byBrand = new Map(links.map((l) => [l.brandId, l.supplierId]));
  const out = new Map<string, string>();
  for (const p of products) {
    const s = byBrand.get(p.brandId!);
    if (s) out.set(p.id, s);
  }
  return out;
}

@Injectable()
export class PrincipalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every active supplier with the brands mapped to it, and every brand with its principal. */
  async list(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const [suppliers, brands, links, schemes] = await Promise.all([
      this.prisma.supplier.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, phone: true, outstandingDue: true }, orderBy: { name: 'asc' } }),
      this.prisma.brand.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.distPrincipalBrand.findMany({ where: { tenantId }, select: { brandId: true, supplierId: true } }),
      this.prisma.tradeScheme.groupBy({ by: ['supplierId'], where: { tenantId, supplierId: { not: null } }, _count: { _all: true } }),
    ]);
    const brandOwner = new Map(links.map((l) => [l.brandId, l.supplierId]));
    const schemeCount = new Map(schemes.map((s) => [s.supplierId, s._count._all]));
    return {
      suppliers: suppliers.map((s) => {
        const mine = brands.filter((b) => brandOwner.get(b.id) === s.id);
        return {
          ...s, brandIds: mine.map((b) => b.id), brandNames: mine.map((b) => b.name), schemes: schemeCount.get(s.id) ?? 0,
          isPrincipal: mine.length > 0 || (schemeCount.get(s.id) ?? 0) > 0,
        };
      }),
      brands: brands.map((b) => ({ ...b, supplierId: brandOwner.get(b.id) ?? null })),
    };
  }

  /** Sets the brands of one principal. A brand taken from another principal moves here. */
  async setBrands(user: AuthenticatedUser, supplierId: string, brandIds: string[]) {
    const tenantId = user.tenantId;
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Supplier (principal) nahi mila');
    const ids = [...new Set(brandIds.filter(Boolean))];
    if (ids.length) {
      const found = await this.prisma.brand.count({ where: { tenantId, id: { in: ids } } });
      if (found !== ids.length) throw new BadRequestException('Kuch brands nahi mile');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.distPrincipalBrand.deleteMany({ where: { tenantId, supplierId, brandId: { notIn: ids } } });
      for (const brandId of ids) {
        await tx.distPrincipalBrand.upsert({
          where: { tenantId_brandId: { tenantId, brandId } },
          create: { tenantId, supplierId, brandId },
          update: { supplierId },
        });
      }
    });
    return this.list(user);
  }
}
