import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { dayKey, dayRange, parseDay } from '../meat-common';
import { r2, r3, str, withNextNumber } from '../meat-money';
import { convertStock } from '../meat-stock';

const METHODS = ['HALAL_HAND', 'HALAL_MACHINE', 'KOSHER', 'STANDARD', 'ORGANIC', 'FREE_RANGE', 'OTHER'];
const ANIMALS = ['BEEF', 'MUTTON', 'GOAT', 'LAMB', 'CHICKEN', 'DUCK', 'TURKEY', 'QUAIL', 'CAMEL', 'BUFFALO', 'FISH', 'PRAWN', 'OTHER'];
const GRADES = ['PREMIUM', 'GRADE_A', 'GRADE_B', 'GRADE_C', 'STANDARD', 'ECONOMY'];

/** Record fields the form may set after the stock was posted (never weights). */
const RECORD_FIELDS = [
  'slaughterTime', 'slaughteredBy', 'slaughtererCertNumber', 'witnessedBy', 'facilityName', 'facilityLicense', 'facilityAddress',
  'halalCertNumber', 'religiousAuthority', 'vetInspectorName', 'vetCertNumber', 'postMortemNotes', 'storageLocation', 'notes',
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
type Body = any;

function recordFields(dto: Body) {
  const out: Record<string, unknown> = {};
  for (const k of RECORD_FIELDS) if (dto?.[k] !== undefined) out[k] = str(dto[k], 2000);
  if (dto?.isHalal !== undefined) out.isHalal = !!dto.isHalal;
  if (dto?.vetInspection !== undefined) out.vetInspection = !!dto.vetInspection;
  if (dto?.qualityGrade !== undefined) out.qualityGrade = GRADES.includes(dto.qualityGrade) ? dto.qualityGrade : null;
  if (dto?.temperature !== undefined) out.temperature = Number.isFinite(Number(dto.temperature)) && dto.temperature !== '' && dto.temperature !== null ? Number(dto.temperature) : null;
  return out;
}

/**
 * Slaughter / dressing: live weight in, dressed meat (and offal, skin) out.
 *
 * With a live-stock item (birds or animals bought through a mandi purchase)
 * the live kg leave that item at its cost and the meat comes in at the same
 * total value. An older animal entered without a purchase brings its own
 * price instead. Without either, only the halal record is kept.
 */
@Injectable()
export class SlaughterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: Body, scope: ShopScope) {
    const liveKg = r3(Number(dto?.liveWeightKg));
    if (!(liveKg > 0)) throw new BadRequestException('Zinda wazan (kg) likhein');
    const dressedKg = dto?.dressedWeightKg === undefined || dto?.dressedWeightKg === null || dto?.dressedWeightKg === '' ? null : r3(Number(dto.dressedWeightKg));
    if (dressedKg !== null && !(dressedKg >= 0)) throw new BadRequestException('Gosht ka wazan theek likhein');
    const extras: Array<{ productId: string; qty: number }> = Array.isArray(dto?.extras)
      ? dto.extras.filter((e: Body) => e?.productId && Number(e.kg) > 0).map((e: Body) => ({ productId: String(e.productId), qty: r3(Number(e.kg)) }))
      : [];
    const outKg = (dressedKg ?? 0) + extras.reduce((s, e) => s + e.qty, 0);
    if (outKg > liveKg + 0.0005) throw new BadRequestException('Gosht aur baqi cheezon ka wazan zinda wazan se zyada nahi ho sakta');
    const method = METHODS.includes(dto?.slaughterMethod) ? dto.slaughterMethod : 'HALAL_HAND';

    const liveAnimalId = str(dto?.liveAnimalId);
    const animal = liveAnimalId ? await this.prisma.meatLiveAnimal.findFirst({ where: { id: liveAnimalId, tenantId: user.tenantId, isActive: true } }) : null;
    if (liveAnimalId && !animal) throw new NotFoundException('Janwar nahi mila');
    if (animal?.isSlaughtered) throw new BadRequestException('Ye janwar pehle hi zibah ho chuka hai');
    const animalType = animal?.animalType ?? (ANIMALS.includes(dto?.animalType) ? dto.animalType : null);
    if (!animalType) throw new BadRequestException('Janwar ka type chunein');

    const sourceProductId = str(dto?.sourceProductId);
    const stockProductId = str(dto?.stockProductId);
    if (stockProductId && !(dressedKg && dressedKg > 0)) throw new BadRequestException('Stock me dalne ke liye gosht ka wazan (kg) likhein');
    if (!stockProductId && extras.length) throw new BadRequestException('Pehle gosht ka item chunein');
    if (sourceProductId && !stockProductId) throw new BadRequestException('Gosht kis item me stock me jayega — chunein');
    const legacyValue = animal && !sourceProductId ? r2(animal.purchasePrice) : 0;
    if (stockProductId && !sourceProductId && !(legacyValue > 0)) {
      throw new BadRequestException('Zinda maal ka item chunein (jo mandi purchase me aaya) — warna gosht bina cost ke stock me aa jata');
    }
    const shopId = stockProductId ? await resolveWriteShopId(this.prisma, user.tenantId, scope, dto?.shopId) : (scope.shopId ?? null);
    const yieldPct = dressedKg ? r2((dressedKg / liveKg) * 100) : null;
    const year = dayKey().slice(0, 4);

    return withNextNumber(
      async (prefix) => (await this.prisma.meatSlaughterLog.findFirst({ where: { tenantId: user.tenantId, slaughterNumber: { startsWith: prefix } }, orderBy: { slaughterNumber: 'desc' }, select: { slaughterNumber: true } }))?.slaughterNumber,
      `SL-${year}-`, 5,
      (slaughterNumber) => this.prisma.$transaction(async (tx) => {
        let stock: Prisma.InputJsonValue | undefined;
        if (stockProductId) {
          const res = await convertStock(tx, user, {
            shopId: shopId!, reference: slaughterNumber,
            note: `Zibah${animal ? ` (${animal.tagNumber})` : ''}: ${liveKg} kg zinda se`,
            take: sourceProductId ? [{ productId: sourceProductId, qty: liveKg }] : [],
            give: [{ productId: stockProductId, qty: dressedKg! }, ...extras],
            ...(!sourceProductId && { value: legacyValue }),
          });
          stock = { sourceProductId, value: res.value, given: res.given } as unknown as Prisma.InputJsonValue;
        }
        const log = await tx.meatSlaughterLog.create({
          data: {
            ...recordFields(dto),
            tenantId: user.tenantId, shopId, slaughterNumber, liveAnimalId: animal?.id ?? null,
            animalType, animalTag: animal?.tagNumber ?? str(dto?.animalTag, 60), slaughterMethod: method,
            slaughterDate: parseDay(dto?.slaughterDate) ?? new Date(),
            liveWeightKg: liveKg, dressedWeightKg: dressedKg, yieldPct, createdById: user.id,
          },
        });
        if (animal) {
          const done = await tx.meatLiveAnimal.updateMany({
            where: { id: animal.id, isSlaughtered: false },
            data: { isSlaughtered: true, slaughteredAt: new Date(), slaughterMethod: method, slaughterCertBy: str(dto?.slaughteredBy), slaughterWeightKg: liveKg, meatYieldKg: dressedKg, yieldPct },
          });
          if (!done.count) throw new BadRequestException('Ye janwar abhi zibah ho chuka hai');
        }
        return { ...log, stock: stock ?? null };
      }, { timeout: 30_000 }),
    );
  }

  async list(user: AuthenticatedUser, params: { animalType?: string; from?: string; to?: string; search?: string }) {
    const range = dayRange(params.from, params.to);
    return this.prisma.meatSlaughterLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.animalType && ANIMALS.includes(params.animalType) && { animalType: params.animalType as never }),
        ...(range && { slaughterDate: range }),
        ...(params.search && {
          OR: [
            { slaughterNumber: { contains: params.search, mode: 'insensitive' } },
            { animalTag: { contains: params.search, mode: 'insensitive' } },
            { slaughteredBy: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { slaughterDate: 'desc' },
      take: 300,
    });
  }

  /** Stock moves a slaughter record made, from its stock movements. */
  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.meatSlaughterLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Record nahi mila');
    const moves = await this.prisma.stockMovement.findMany({
      where: { tenantId: user.tenantId, reference: s.slaughterNumber },
      select: { productId: true, quantity: true, unitCost: true, type: true, product: { select: { name: true, unit: true } } },
    });
    return { ...s, moves: moves.map((m) => ({ productId: m.productId, name: m.product.name, unit: m.product.unit, qty: m.quantity, unitCost: m.unitCost ?? 0, type: m.type })) };
  }

  async update(user: AuthenticatedUser, id: string, dto: Body) {
    const s = await this.prisma.meatSlaughterLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Record nahi mila');
    return this.prisma.meatSlaughterLog.update({ where: { id }, data: recordFields(dto) });
  }

  async halalCompliance(user: AuthenticatedUser, from?: string, to?: string) {
    const where: Prisma.MeatSlaughterLogWhereInput = { tenantId: user.tenantId };
    const range = dayRange(from, to);
    if (range) where.slaughterDate = range;

    const [total, halal, withCert, withVet, weights] = await Promise.all([
      this.prisma.meatSlaughterLog.count({ where }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, isHalal: true } }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, halalCertNumber: { not: null } } }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, vetInspection: true } }),
      this.prisma.meatSlaughterLog.aggregate({ where: { ...where, dressedWeightKg: { not: null } }, _sum: { liveWeightKg: true, dressedWeightKg: true } }),
    ]);
    const live = Number(weights._sum.liveWeightKg) || 0;
    const dressed = Number(weights._sum.dressedWeightKg) || 0;
    return {
      total,
      halal,
      halalPct: total > 0 ? (halal / total) * 100 : 0,
      withCert,
      certPct: total > 0 ? (withCert / total) * 100 : 0,
      withVet,
      vetPct: total > 0 ? (withVet / total) * 100 : 0,
      liveKg: r3(live),
      dressedKg: r3(dressed),
      yieldPct: live > 0 ? r2((dressed / live) * 100) : 0,
    };
  }
}
