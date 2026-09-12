import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

export interface ReconcileReport {
  productsChecked: number;
  productsFixed: number;
  variantsFixed: number;
  rowsCreated: number;
  unitsParked: number;
  homeShop: { id: string; name: string } | null;
  details: Array<{
    productId: string;
    name: string;
    globalBefore: number;
    branchSum: number;
    parkedInHomeShop: number;
  }>;
}

/**
 * ════════════════════════════════════════════════════════════════
 * STOCK RECONCILE
 * ════════════════════════════════════════════════════════════════
 *
 * `ShopStock` is the truth; `Product.stock` and `ProductVariant.stock` are
 * caches of it. Historically purchases wrote only to the cache and sales wrote
 * only to the branch rows, so tenants that were running before the multi-shop
 * release can carry a gap between the two.
 *
 * This walks the catalogue and closes that gap:
 *   - units that exist globally but sit in no branch are parked in the main
 *     shop (that is physically where they were);
 *   - the cached totals are then re-derived from the branch rows.
 *
 * Safe to run repeatedly — a reconciled tenant reports zero fixes.
 */
@Injectable()
export class StockReconcileService {
  private readonly logger = new Logger(StockReconcileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(user: AuthenticatedUser, dryRun = false): Promise<ReconcileReport> {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner stock reconcile kar sakta hai');
    }
    const tenantId = user.tenantId;

    const homeShop = await this.prisma.shop.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, name: true },
    });

    const report: ReconcileReport = {
      productsChecked: 0,
      productsFixed: 0,
      variantsFixed: 0,
      rowsCreated: 0,
      unitsParked: 0,
      homeShop,
      details: [],
    };

    if (!homeShop) return report;

    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: { id: true, name: true, stock: true },
    });
    report.productsChecked = products.length;
    if (products.length === 0) return report;

    const productIds = products.map((p) => p.id);

    const branchRows = await this.prisma.shopStock.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _sum: { stock: true },
    });
    const branchSum = new Map(
      branchRows.map((r) => [r.productId, Number(r._sum.stock ?? 0)]),
    );

    for (const product of products) {
      const sum = branchSum.get(product.id) ?? 0;
      const global = Number(product.stock);
      const gap = Number((global - sum).toFixed(4));

      // Only a positive gap is real stock that the branch rows have not
      // accounted for. A negative one means the cache is simply stale, and
      // recaching below fixes it without inventing units.
      //
      // Variant products are parked too. Leaving their gap alone would keep
      // Product.stock above the sum of its branch rows, and the next
      // applyStockDelta() would then quietly recache it downwards — stock
      // appearing to vanish on its own. Parking keeps the count and turns the
      // fix into an explicit stock adjustment. This never reduces stock.
      if (gap > 0.0001) {
        report.unitsParked += gap;
        report.details.push({
          productId: product.id,
          name: product.name,
          globalBefore: global,
          branchSum: sum,
          parkedInHomeShop: gap,
        });

        if (!dryRun) {
          const existing = await this.prisma.shopStock.findFirst({
            where: { shopId: homeShop.id, productId: product.id, variantId: null },
            select: { id: true, stock: true },
          });
          if (existing) {
            await this.prisma.shopStock.update({
              where: { id: existing.id },
              data: { stock: Number(existing.stock) + gap },
            });
          } else {
            await this.prisma.shopStock.create({
              data: {
                tenantId,
                shopId: homeShop.id,
                productId: product.id,
                variantId: null,
                stock: gap,
                isActive: true,
              },
            });
            report.rowsCreated += 1;
          }
        }
        branchSum.set(product.id, sum + gap);
      }

      const target = branchSum.get(product.id) ?? 0;
      if (Math.abs(target - global) > 0.0001) {
        report.productsFixed += 1;
        if (!dryRun) {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { stock: target },
          });
        }
      }
    }

    // Variants mirror their own branch rows.
    const variantRows = await this.prisma.shopStock.groupBy({
      by: ['variantId'],
      where: { productId: { in: productIds }, variantId: { not: null } },
      _sum: { stock: true },
    });

    for (const row of variantRows) {
      if (!row.variantId) continue;
      const target = Number(row._sum.stock ?? 0);
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: row.variantId },
        select: { stock: true },
      });
      if (!variant || Math.abs(Number(variant.stock) - target) <= 0.0001) continue;

      report.variantsFixed += 1;
      if (!dryRun) {
        await this.prisma.productVariant.update({
          where: { id: row.variantId },
          data: { stock: target },
        });
      }
    }

    this.logger.log(
      `Stock reconcile (${dryRun ? 'dry-run' : 'applied'}) for tenant ${tenantId}: ` +
        `${report.productsFixed} products, ${report.variantsFixed} variants, ` +
        `${report.unitsParked} units parked in ${homeShop.name}`,
    );

    // Keep only the biggest gaps in the response — the log has the rest.
    report.details = report.details
      .sort((a, b) => b.parkedInHomeShop - a.parkedInHomeShop)
      .slice(0, 50);

    return report;
  }
}
