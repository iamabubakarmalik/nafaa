import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';

@Injectable()
export class SubstitutesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(user: AuthenticatedUser, mainMedicineId: string, substituteMedicineId: string, notes?: string) {
    if (mainMedicineId === substituteMedicineId) throw new BadRequestException('Dawai apni hi substitute nahi ho sakti');
    const [main, sub] = await Promise.all([
      this.prisma.pharmacyMedicine.findFirst({ where: { id: mainMedicineId, tenantId: user.tenantId } }),
      this.prisma.pharmacyMedicine.findFirst({ where: { id: substituteMedicineId, tenantId: user.tenantId } }),
    ]);
    if (!main || !sub) throw new NotFoundException('Dawai nahi mili');
    const dup = await this.prisma.medicineSubstitute.findFirst({ where: { mainMedicineId, substituteMedicineId }, select: { id: true } });
    if (dup) throw new BadRequestException('Ye substitute pehle se jura hai');

    const [mainProduct, subProduct] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: main.productId } }),
      this.prisma.product.findUnique({ where: { id: sub.productId } }),
    ]);

    return this.prisma.medicineSubstitute.create({
      data: {
        mainMedicineId,
        substituteMedicineId,
        priceDifference: (subProduct?.price ?? 0) - (mainProduct?.price ?? 0),
        notes,
      },
      include: { main: { include: { product: true } }, substitute: { include: { product: true } } },
    });
  }

  async list(user: AuthenticatedUser, mainMedicineId: string) {
    return this.prisma.medicineSubstitute.findMany({
      where: { mainMedicineId, main: { tenantId: user.tenantId } },
      include: {
        substitute: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                productSalts: { include: { salt: true } },
              },
            },
          },
        },
      },
    });
  }

  async findByProduct(user: AuthenticatedUser, productId: string) {
    const med = await this.prisma.pharmacyMedicine.findFirst({ where: { productId, tenantId: user.tenantId } });
    if (!med) return [];
    return this.list(user, med.id);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const sub = await this.prisma.medicineSubstitute.findFirst({ where: { id, main: { tenantId: user.tenantId } } });
    if (!sub) throw new NotFoundException('Substitute nahi mila');
    return this.prisma.medicineSubstitute.delete({ where: { id } });
  }

  /**
   * Other medicines with the same salts, for when the asked-for brand is out
   * of stock. Exact matches (same salts, same strength) come first, then those
   * on the shelf of this branch, then the cheaper ones.
   */
  async autoSuggest(user: AuthenticatedUser, scope: ShopScope, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true, price: true, productSalts: { select: { saltId: true, strength: true } } },
    });
    if (!product || product.productSalts.length === 0) return [];
    const mine = new Map(product.productSalts.map((ps) => [ps.saltId, norm(ps.strength)]));

    const others = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        id: { not: productId },
        productSalts: { some: { saltId: { in: [...mine.keys()] } } },
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        productSalts: { include: { salt: true } },
        pharmacyMedicine: true,
        shopStocks: { where: { variantId: null, ...scope.where }, select: { stock: true } },
      },
      take: 200,
    });

    return others
      .map((p) => {
        const matchedSalts = p.productSalts.filter((ps) => mine.has(ps.saltId));
        const sameStrength = matchedSalts.length === mine.size && matchedSalts.every((ps) => norm(ps.strength) === mine.get(ps.saltId));
        const exact = sameStrength && p.productSalts.length === mine.size;
        const { shopStocks, ...rest } = p;
        const stock = scope.shopId ? shopStocks.reduce((t, r) => t + Number(r.stock || 0), 0) : Number(p.stock || 0);
        return {
          product: rest,
          matchedSalts,
          similarity: exact ? 1 : matchedSalts.length / Math.max(mine.size, p.productSalts.length),
          sameStrength,
          exact,
          stock,
          priceDifference: Number(p.price || 0) - Number(product.price || 0),
        };
      })
      .sort((a, b) => Number(b.exact) - Number(a.exact)
        || Number(b.stock > 0) - Number(a.stock > 0)
        || b.similarity - a.similarity
        || a.product.price - b.product.price);
  }
}

/** "500 mg" and "500MG" are the same strength. */
const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, '');
