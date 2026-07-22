import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class SubstitutesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(user: AuthenticatedUser, mainMedicineId: string, substituteMedicineId: string, notes?: string) {
    if (mainMedicineId === substituteMedicineId) throw new BadRequestException('Cannot substitute with itself');
    const [main, sub] = await Promise.all([
      this.prisma.pharmacyMedicine.findFirst({ where: { id: mainMedicineId, tenantId: user.tenantId } }),
      this.prisma.pharmacyMedicine.findFirst({ where: { id: substituteMedicineId, tenantId: user.tenantId } }),
    ]);
    if (!main || !sub) throw new NotFoundException('Medicine not found');

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
    if (!sub) throw new NotFoundException('Substitute not found');
    return this.prisma.medicineSubstitute.delete({ where: { id } });
  }

  /**
   * Auto-suggest substitutes based on shared salts + strength.
   */
  async autoSuggest(user: AuthenticatedUser, productId: string) {
    const productSalts = await this.prisma.productSalt.findMany({
      where: { productId },
      include: { salt: true },
    });
    if (productSalts.length === 0) return [];

    const saltIds = productSalts.map((ps) => ps.saltId);

    // Find other products sharing at least one salt
    const others = await this.prisma.productSalt.findMany({
      where: {
        saltId: { in: saltIds },
        productId: { not: productId },
        product: { tenantId: user.tenantId, isActive: true },
      },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            productSalts: { include: { salt: true } },
            pharmacyMedicine: true,
          },
        },
        salt: true,
      },
    });

    // Group by product, calculate similarity
    const byProduct = new Map<string, any>();
    for (const ps of others) {
      if (!byProduct.has(ps.productId)) {
        byProduct.set(ps.productId, { product: ps.product, matchedSalts: [] });
      }
      byProduct.get(ps.productId).matchedSalts.push(ps);
    }

    const suggestions = Array.from(byProduct.values()).map((entry) => ({
      product: entry.product,
      matchedSalts: entry.matchedSalts,
      similarity: entry.matchedSalts.length / saltIds.length,
    }));

    return suggestions.sort((a, b) => b.similarity - a.similarity);
  }
}
