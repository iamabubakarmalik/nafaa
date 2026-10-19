import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { MONEY_METHODS } from '../../../common/helpers/sale-payments.helper';
import { PurchasesService } from '../../../modules/purchasing/purchases/purchases.service';
import { CreatePurchaseDto } from '../../../modules/purchasing/purchases/dto/create-purchase.dto';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { parseDay } from '../meat-common';
import { r2, r3, r4, str } from '../meat-money';

const ANIMALS = ['BEEF', 'MUTTON', 'GOAT', 'LAMB', 'CHICKEN', 'DUCK', 'TURKEY', 'QUAIL', 'CAMEL', 'BUFFALO', 'FISH', 'PRAWN', 'OTHER'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
type Body = any;

/** Fields an animal's own form may change; purchase, slaughter and money columns stay with the server. */
function animalFields(dto: Body) {
  const out: Record<string, unknown> = {};
  for (const k of ['breed', 'color', 'sex', 'vaccinationStatus', 'healthCertUrl', 'healthNotes', 'feedingType', 'notes', 'sourceName'] as const) {
    if (dto?.[k] !== undefined) out[k] = str(dto[k], 2000);
  }
  if (dto?.ageMonths !== undefined) out.ageMonths = Number(dto.ageMonths) > 0 ? Math.round(Number(dto.ageMonths)) : null;
  if (dto?.isHealthy !== undefined) out.isHealthy = !!dto.isHealthy;
  if (dto?.vetCheckedAt !== undefined) out.vetCheckedAt = parseDay(dto.vetCheckedAt);
  if (dto?.weightKg !== undefined) {
    const w = r3(Number(dto.weightKg));
    if (!(w > 0)) throw new BadRequestException('Wazan (kg) theek likhein');
    out.weightKg = w;
  }
  return out;
}

const method = (v: unknown): PaymentMethod => {
  const m = String(v ?? 'CASH').toUpperCase() as PaymentMethod;
  if (!MONEY_METHODS.includes(m)) throw new BadRequestException('Paisa dene ka tareeqa theek nahi');
  return m;
};

/**
 * Live stock: animals with a tag (bakra, gaye) and birds bought by weight.
 *
 * A mandi purchase is a normal supplier purchase of the shop's live-stock
 * item (kg), so the money reaches the supplier khata, day book and drawer,
 * and the live kg come into stock at cost. Tagged animals also get a row
 * here for health, feed and slaughter. Feed is a paid expense.
 */
@Injectable()
export class LiveAnimalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchases: PurchasesService,
    private readonly expenses: ExpensesService,
  ) {}

  /** Mandi purchase: birds by weight, or one or more animals. */
  async mandi(user: AuthenticatedUser, scope: ShopScope, dto: Body) {
    const supplierId = str(dto?.supplierId);
    if (!supplierId) throw new BadRequestException('Supplier (beopari / mandi) chunein');
    const productId = str(dto?.productId);
    if (!productId) throw new BadRequestException('Zinda maal ka item chunein (jaise "Zinda murgi" ya "Bakra zinda")');
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId, isActive: true }, select: { id: true, name: true, unit: true, hasVariants: true } });
    if (!product) throw new NotFoundException('Zinda maal ka item nahi mila');
    if (product.hasVariants) throw new BadRequestException('Zinda maal ka item bina variant ka hona chahiye');

    const animals: Body[] = Array.isArray(dto?.animals) ? dto.animals : [];
    const items: CreatePurchaseDto['items'] = [];
    const rows: Array<{ tagNumber: string; animalType: string; breed: string | null; color: string | null; sex: string | null; ageMonths: number | null; weightKg: number; price: number }> = [];
    if (animals.length) {
      if (animals.length > 200) throw new BadRequestException('Ek purchase me 200 se zyada janwar nahi');
      const tags = new Set<string>();
      let next = await this.prisma.meatLiveAnimal.count({ where: { tenantId: user.tenantId } });
      for (const [i, a] of animals.entries()) {
        const weightKg = r3(Number(a?.weightKg));
        const price = r2(Number(a?.price));
        if (!(weightKg > 0)) throw new BadRequestException(`Janwar ${i + 1}: wazan (kg) likhein — andaza bhi chalega`);
        if (!(price > 0)) throw new BadRequestException(`Janwar ${i + 1}: qeemat likhein`);
        const animalType = ANIMALS.includes(a?.animalType) ? a.animalType : null;
        if (!animalType) throw new BadRequestException(`Janwar ${i + 1}: type chunein`);
        let tag = str(a?.tagNumber, 40);
        if (!tag) { next += 1; tag = `ANM-${String(next).padStart(5, '0')}`; }
        if (tags.has(tag)) throw new BadRequestException(`Tag ${tag} do baar likha hai`);
        tags.add(tag);
        rows.push({ tagNumber: tag, animalType, breed: str(a?.breed, 80), color: str(a?.color, 40), sex: str(a?.sex, 20), ageMonths: Number(a?.ageMonths) > 0 ? Math.round(Number(a.ageMonths)) : null, weightKg, price });
        items.push({ productId: product.id, quantity: weightKg, costPrice: r4(price / weightKg) } as CreatePurchaseDto['items'][number]);
      }
      const dup = await this.prisma.meatLiveAnimal.findMany({ where: { tenantId: user.tenantId, tagNumber: { in: [...tags] } }, select: { tagNumber: true } });
      if (dup.length) throw new BadRequestException(`Ye tag pehle se hai: ${dup.map((d) => d.tagNumber).join(', ')}`);
    } else {
      const kg = r3(Number(dto?.kg));
      const rate = r2(Number(dto?.ratePerKg));
      if (!(kg > 0)) throw new BadRequestException('Kitne kg zinda maal aaya — likhein');
      if (!(rate > 0)) throw new BadRequestException('Zinda rate (per kg) likhein');
      items.push({ productId: product.id, quantity: kg, costPrice: rate } as CreatePurchaseDto['items'][number]);
    }

    const count = Number(dto?.birds) > 0 ? Math.round(Number(dto.birds)) : null;
    const notes = [count ? `${count} birds` : null, str(dto?.notes, 400)].filter(Boolean).join(' · ') || undefined;
    const paid = dto?.paidAmount === undefined || dto?.paidAmount === null || dto?.paidAmount === '' ? undefined : r2(Math.max(Number(dto.paidAmount) || 0, 0));
    const otherCharges = Number(dto?.otherCharges) > 0 ? r2(Number(dto.otherCharges)) : undefined;
    const purchase = await this.purchases.create(user, scope, {
      supplierId, paymentMethod: method(dto?.paymentMethod), paidAmount: paid, otherCharges, notes,
      purchasedAt: parseDay(dto?.purchasedAt)?.toISOString(), items,
    } as CreatePurchaseDto);

    if (rows.length) {
      const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId: user.tenantId }, select: { name: true } });
      await this.prisma.meatLiveAnimal.createMany({
        data: rows.map(({ price, ...r }) => ({
          ...r, animalType: r.animalType as never, tenantId: user.tenantId, shopId: purchase.shopId,
          purchasePrice: price, purchaseDate: purchase.purchasedAt, vendorId: supplierId, vendorName: supplier?.name ?? null,
          sourceName: purchase.purchaseNumber,
        })),
      });
    }
    return { purchaseId: purchase.id, purchaseNumber: purchase.purchaseNumber, total: purchase.total, paidAmount: purchase.paidAmount, animals: rows.length };
  }

  /** An animal noted without a purchase (raised at home, older records). */
  async create(user: AuthenticatedUser, dto: Body) {
    const animalType = ANIMALS.includes(dto?.animalType) ? dto.animalType : null;
    if (!animalType) throw new BadRequestException('Janwar ka type chunein');
    const fields = animalFields(dto);
    if (!fields.weightKg) throw new BadRequestException('Wazan (kg) likhein');
    let tagNumber = str(dto?.tagNumber, 40);
    if (!tagNumber) {
      const count = await this.prisma.meatLiveAnimal.count({ where: { tenantId: user.tenantId } });
      tagNumber = 'ANM-' + String(count + 1).padStart(5, '0');
    }
    const dup = await this.prisma.meatLiveAnimal.findFirst({ where: { tenantId: user.tenantId, tagNumber } });
    if (dup) throw new BadRequestException('Ye tag number pehle se hai');
    return this.prisma.meatLiveAnimal.create({
      data: {
        ...fields, weightKg: fields.weightKg as number, tenantId: user.tenantId, tagNumber, animalType,
        purchasePrice: r2(Math.max(Number(dto?.purchasePrice) || 0, 0)), vendorName: str(dto?.vendorName, 120),
        purchaseDate: parseDay(dto?.purchaseDate) ?? new Date(),
      },
    });
  }

  async list(user: AuthenticatedUser, params: { animalType?: string; isSlaughtered?: boolean; isSold?: boolean; search?: string }) {
    return this.prisma.meatLiveAnimal.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.animalType && ANIMALS.includes(params.animalType) && { animalType: params.animalType as never }),
        ...(params.isSlaughtered !== undefined && { isSlaughtered: params.isSlaughtered }),
        ...(params.isSold !== undefined && { isSold: params.isSold }),
        ...(params.search && {
          OR: [
            { tagNumber: { contains: params.search, mode: 'insensitive' } },
            { breed: { contains: params.search, mode: 'insensitive' } },
            { vendorName: { contains: params.search, mode: 'insensitive' } },
            { sourceName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.meatLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Janwar nahi mila');
    return a;
  }

  async update(user: AuthenticatedUser, id: string, dto: Body) {
    const a = await this.getOne(user, id);
    if (a.isSlaughtered && dto?.weightKg !== undefined) throw new BadRequestException('Zibah ke baad wazan nahi badla ja sakta');
    return this.prisma.meatLiveAnimal.update({ where: { id }, data: animalFields(dto) });
  }

  /** Feed for some days, paid now: a shop expense, and noted on the animal. */
  async addFeedCost(user: AuthenticatedUser, scope: ShopScope, id: string, body: Body) {
    const a = await this.getOne(user, id);
    if (a.isSlaughtered) throw new BadRequestException('Zibah ho chuka janwar ka chara nahi likha ja sakta');
    const days = Number(body?.days);
    const costPerDay = r2(Number(body?.costPerDay));
    if (!Number.isInteger(days) || days <= 0 || days > 365 || !(costPerDay > 0)) throw new BadRequestException('Din aur rozana chare ka kharcha sahi likhein');
    const amount = r2(days * costPerDay);
    await this.expenses.create(user, scope, {
      title: `Chara: ${a.tagNumber} (${days} din)`, amount, paymentMethod: method(body?.paymentMethod),
      description: `${days} din x Rs ${costPerDay}`, shopId: a.shopId ?? undefined,
    } as Parameters<ExpensesService['create']>[2]);
    return this.prisma.meatLiveAnimal.update({
      where: { id },
      data: { daysHeld: { increment: days }, totalFeedCost: { increment: amount }, dailyFeedCost: costPerDay },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.meatLiveAnimal.update({ where: { id }, data: { isActive: false } });
  }

  async summary(user: AuthenticatedUser) {
    const where = { tenantId: user.tenantId, isActive: true, isSlaughtered: false };
    const [byType, totalCost, aliveCount] = await Promise.all([
      this.prisma.meatLiveAnimal.groupBy({ by: ['animalType'], where, _count: { _all: true }, _sum: { weightKg: true } }),
      this.prisma.meatLiveAnimal.aggregate({ where, _sum: { purchasePrice: true, totalFeedCost: true } }),
      this.prisma.meatLiveAnimal.count({ where }),
    ]);
    return { byType, totalCost, aliveCount };
  }
}
