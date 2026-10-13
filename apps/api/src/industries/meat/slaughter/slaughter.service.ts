import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { cleanInput, dayRange, parseDay } from '../meat-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../../common/shop-scope';

const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

@Injectable()
export class SlaughterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any, viewingShopId?: string | null) {
    // Where the meat goes in stock; not a column of the log itself.
    const { stockProductId, ...input } = dto ?? {};
    dto = input;
    if (dto.liveAnimalId === '') dto.liveAnimalId = undefined;
    let animal: { purchasePrice: number; totalFeedCost: number } | null = null;
    if (dto.liveAnimalId) {
      const found = await this.prisma.meatLiveAnimal.findFirst({ where: { id: dto.liveAnimalId, tenantId: user.tenantId } });
      if (!found) throw new NotFoundException('Janwar nahi mila');
      if (found.isSlaughtered) throw new BadRequestException('Ye janwar pehle hi zibah ho chuka hai');
      animal = found;
    }
    let stockProduct: { id: string; name: string; stock: number; costPrice: number } | null = null;
    if (stockProductId) {
      if (!(Number(dto.dressedWeightKg) > 0)) throw new BadRequestException('Stock me dalne ke liye gosht ka wazan (kg) likhein');
      stockProduct = await this.prisma.product.findFirst({
        where: { id: stockProductId, tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true, stock: true, costPrice: true },
      });
      if (!stockProduct) throw new NotFoundException('Stock wala item nahi mila');
    }
    if (!(Number(dto.liveWeightKg) > 0)) throw new BadRequestException('Zinda wazan (kg) likhein');
    if (dto.dressedWeightKg != null && Number(dto.dressedWeightKg) > Number(dto.liveWeightKg)) {
      throw new BadRequestException('Gosht ka wazan zinda wazan se zyada nahi ho sakta');
    }
    const count = await this.prisma.meatSlaughterLog.count({ where: { tenantId: user.tenantId } });
    const slaughterNumber = 'SL-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    return this.prisma.$transaction(async (tx) => {
      const yieldPct = dto.dressedWeightKg && dto.liveWeightKg
        ? (dto.dressedWeightKg / dto.liveWeightKg) * 100
        : null;

      const log = await tx.meatSlaughterLog.create({
        data: {
          ...cleanInput(dto),
          tenantId: user.tenantId,
          slaughterNumber,
          slaughterDate: parseDay(dto.slaughterDate) ?? new Date(),
          yieldPct,
          createdById: user.id,
        },
      });

      // Mark live animal as slaughtered
      if (dto.liveAnimalId) {
        await tx.meatLiveAnimal.update({
          where: { id: dto.liveAnimalId },
          data: {
            isSlaughtered: true,
            slaughteredAt: new Date(),
            slaughterMethod: dto.slaughterMethod,
            slaughterCertBy: dto.slaughteredBy,
            slaughterWeightKg: dto.liveWeightKg,
            meatYieldKg: dto.dressedWeightKg,
            yieldPct,
          },
        });
      }

      /* Dressed meat goes into stock at what the animal cost (purchase plus
         feed) per kg, the same way a purchase would bring it in. Before,
         the only way was a hand stock adjustment, which the profit report
         counts as found goods and shows as profit. */
      if (stockProduct) {
        const kg = Number(dto.dressedWeightKg);
        const animalCost = animal ? Number(animal.purchasePrice) + Number(animal.totalFeedCost) : 0;
        const unitCost = animalCost > 0 ? r4(animalCost / kg) : Number(stockProduct.costPrice);
        const old = Math.max(Number(stockProduct.stock), 0);
        const avg = r4(old > 0 ? (old * Number(stockProduct.costPrice) + kg * unitCost) / (old + kg) : unitCost);
        if (avg > 0) {
          await tx.product.update({ where: { id: stockProduct.id }, data: { costPrice: avg } });
          const units = await tx.productUnit.findMany({ where: { productId: stockProduct.id, variantId: null }, select: { id: true, conversionRate: true } });
          for (const u of units) await tx.productUnit.update({ where: { id: u.id }, data: { costPrice: r2(avg * (Number(u.conversionRate) || 1)) } });
        }
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: viewingShopId || user.shopId || (await this.mainShopId(tx, user.tenantId)),
          productId: stockProduct.id, delta: kg, movementType: 'PURCHASE_IN', unitCost,
          reference: slaughterNumber, note: `Zibah se gosht${dto.animalTag ? ` (${dto.animalTag})` : ''}`, userId: user.id,
        });
      }

      return log;
    });
  }

  private async mainShopId(tx: any, tenantId: string): Promise<string> {
    const shop = await tx.shop.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!shop) throw new BadRequestException('Koi active shop nahi hai');
    return shop.id;
  }

  async list(user: AuthenticatedUser, params: { animalType?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.meatSlaughterLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.animalType && { animalType: params.animalType as any }),
        ...(dayRange(params.from, params.to) && { slaughterDate: dayRange(params.from, params.to) }),
        ...(params.search && {
          OR: [
            { slaughterNumber: { contains: params.search, mode: 'insensitive' } },
            { animalTag: { contains: params.search, mode: 'insensitive' } },
            { slaughteredBy: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { slaughterDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.meatSlaughterLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Log not found');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const s = await this.prisma.meatSlaughterLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Log not found');
    return this.prisma.meatSlaughterLog.update({
      where: { id },
      data: {
        ...cleanInput(dto),
        slaughterDate: dto.slaughterDate ? new Date(dto.slaughterDate) : undefined,
      },
    });
  }

  async halalCompliance(user: AuthenticatedUser, from?: string, to?: string) {
    const where: any = { tenantId: user.tenantId };
    const range = dayRange(from, to);
    if (range) where.slaughterDate = range;

    const [total, halal, withCert, withVet] = await Promise.all([
      this.prisma.meatSlaughterLog.count({ where }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, isHalal: true } }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, halalCertNumber: { not: null } } }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, vetInspection: true } }),
    ]);

    return {
      total,
      halal,
      halalPct: total > 0 ? (halal / total) * 100 : 0,
      withCert,
      certPct: total > 0 ? (withCert / total) * 100 : 0,
      withVet,
      vetPct: total > 0 ? (withVet / total) * 100 : 0,
    };
  }
}
