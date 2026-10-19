import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { UpsertMeatProductDto } from './dto/upsert-meat-product.dto';
import { dayEnd, dayKey, dayStart, parseDay } from '../meat-common';
import { r2, r3 } from '../meat-money';

/** Units a butcher sells by weight. */
const WEIGHT_UNITS = ['kg', 'kgs', 'kilogram', 'g', 'gm', 'gram', 'grams'];
/** Stock conversions made by slaughter and cutting carry these references. */
const isConversion = (ref: string | null) => !!ref && (ref.startsWith('SL-') || ref.startsWith('CUT-'));

export interface DaySheetRow {
  productId: string; name: string; unit: string; animalType: string | null; cutCategory: string | null;
  price: number; wholesalePrice: number | null; costPrice: number;
  opening: number; bought: number; madeIn: number; returned: number; sold: number; cutOut: number; waste: number; otherIn: number; otherOut: number;
  closing: number; closingValue: number; now: number;
}

@Injectable()
export class MeatProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertMeatProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Item nahi mila');

    const payload = {
      ...dto,
      halalCertExpiry: dto.halalCertExpiry ? parseDay(dto.halalCertExpiry) : null,
    };

    const existing = await this.prisma.meatProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.meatProductProfile.update({
        where: { productId: dto.productId },
        data: payload,
      });
    }
    return this.prisma.meatProductProfile.create({
      data: { ...payload, tenantId: user.tenantId },
    });
  }

  /**
   * One shop day for every meat item (a meat profile, or sold by weight):
   * opening stock, what came in (purchase, slaughter / cutting, returns),
   * what went out (bills, cutting, wastage) and what was left at day end.
   * Every stock change is a stock movement, so closing = stock now minus
   * the moves after the day.
   */
  async daySheet(user: AuthenticatedUser, scope: ShopScope, date?: string) {
    const from = dayStart(date);
    const to = dayEnd(date);
    const [profiles, products] = await Promise.all([
      this.prisma.meatProductProfile.findMany({ where: { tenantId: user.tenantId }, select: { productId: true, animalType: true, cutCategory: true } }),
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId, isActive: true, hasVariants: false },
        select: { id: true, name: true, unit: true, price: true, wholesalePrice: true, costPrice: true, stock: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    const profileOf = new Map(profiles.map((p) => [p.productId, p]));
    const items = products.filter((p) => profileOf.has(p.id) || WEIGHT_UNITS.includes((p.unit ?? '').toLowerCase()));
    const ids = items.map((p) => p.id);
    if (!ids.length) return { date: dayKey(from), rows: [] as DaySheetRow[], totals: null };

    const shop = scope.shopId ? { shopId: scope.shopId } : {};
    const [moves, branch] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { tenantId: user.tenantId, productId: { in: ids }, variantId: null, createdAt: { gte: from }, ...shop },
        select: { productId: true, type: true, quantity: true, reference: true, note: true, createdAt: true },
      }),
      scope.shopId
        ? this.prisma.shopStock.findMany({ where: { shopId: scope.shopId, productId: { in: ids }, variantId: null }, select: { productId: true, stock: true } })
        : Promise.resolve(null),
    ]);
    const nowOf = new Map<string, number>(branch ? branch.map((b) => [b.productId, Number(b.stock) || 0]) : items.map((p) => [p.id, Number(p.stock) || 0]));

    const rows = items.map((p): DaySheetRow => {
      const r = { bought: 0, madeIn: 0, returned: 0, sold: 0, cutOut: 0, waste: 0, otherIn: 0, otherOut: 0, after: 0 };
      for (const m of moves) {
        if (m.productId !== p.id) continue;
        const q = Number(m.quantity) || 0;
        if (m.createdAt > to) { r.after += q; continue; }
        const conv = isConversion(m.reference);
        switch (m.type) {
          case 'PURCHASE_IN': r.bought += q; break;
          case 'SALE_OUT': r.sold -= q; break;
          // A voided bill puts its stock back: that sale did not happen.
          case 'RETURN_IN': if (m.note?.startsWith('Voided')) r.sold -= q; else r.returned += q; break;
          case 'DAMAGE': case 'LOSS': r.waste -= q; break;
          case 'ADJUSTMENT_IN': if (conv) r.madeIn += q; else r.otherIn += q; break;
          case 'ADJUSTMENT_OUT': if (conv) r.cutOut -= q; else r.otherOut -= q; break;
          default: if (q >= 0) r.otherIn += q; else r.otherOut -= q;
        }
      }
      const now = nowOf.get(p.id) ?? 0;
      const closing = r3(now - r.after);
      const net = r.bought + r.madeIn + r.returned + r.otherIn - r.sold - r.cutOut - r.waste - r.otherOut;
      const prof = profileOf.get(p.id);
      return {
        productId: p.id, name: p.name, unit: p.unit, animalType: prof?.animalType ?? null, cutCategory: prof?.cutCategory ?? null,
        price: p.price, wholesalePrice: p.wholesalePrice ?? null, costPrice: p.costPrice,
        opening: r3(closing - net), bought: r3(r.bought), madeIn: r3(r.madeIn), returned: r3(r.returned), sold: r3(r.sold),
        cutOut: r3(r.cutOut), waste: r3(r.waste), otherIn: r3(r.otherIn), otherOut: r3(r.otherOut),
        closing, closingValue: r2(Math.max(closing, 0) * (Number(p.costPrice) || 0)), now: r3(now),
      };
    });
    const sum = (k: keyof DaySheetRow) => r3(rows.reduce((s, x) => s + (Number(x[k]) || 0), 0));
    return {
      date: dayKey(from), rows,
      totals: { bought: sum('bought'), madeIn: sum('madeIn'), sold: sum('sold'), cutOut: sum('cutOut'), waste: sum('waste'), closing: sum('closing'), closingValue: r2(sum('closingValue')) },
    };
  }

  async list(user: AuthenticatedUser, params: { animalType?: string; cutCategory?: string; freshnessType?: string; featured?: boolean; popular?: boolean; onSale?: boolean; search?: string }) {
    const profiles = await this.prisma.meatProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.animalType && { animalType: params.animalType as never }),
        ...(params.cutCategory && { cutCategory: params.cutCategory as never }),
        ...(params.freshnessType && { freshnessType: params.freshnessType as never }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.popular !== undefined && { isPopular: params.popular }),
        ...(params.onSale !== undefined && { isOnSale: params.onSale }),
      },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: true,
      },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.meatProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.meatProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gosht ki details nahi milin');
    const product = await this.prisma.product.findFirst({
      where: { id: p.productId, tenantId: user.tenantId },
      include: { images: true, category: true },
    });
    return { ...p, product };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.meatProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gosht ki details nahi milin');
    return this.prisma.meatProductProfile.delete({ where: { id } });
  }
}
