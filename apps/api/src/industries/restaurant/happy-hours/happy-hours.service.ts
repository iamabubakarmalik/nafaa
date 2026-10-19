import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { HappyHourRule, RestaurantOrderMode } from '@prisma/client';
import { dateKeyTz, weekdayInTz } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { clockOf, inWindow } from '../menu-items/time-window';
import { round2 } from '../recipes/recipe-units';
import { UpsertHappyHourDto } from './dto/upsert-happy-hour.dto';

/** A bill line to price: menu price per plate before any discount. */
export interface HappyLine { productId: string; quantity: number; unitPrice: number }

/** Date-only input kept at midday UTC, so it reads as the same day in any shop timezone. */
const asDay = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T12:00:00.000Z`) : null);

@Injectable()
export class HappyHoursService {
  constructor(private readonly prisma: PrismaService, private readonly clock: TenantTimezoneService) {}

  /**
   * Checks the window, dates and scope, and holds the rule to the shop's
   * counter rules: a happy hour deeper than the hand-discount limit
   * (Settings → max discount) needs someone trusted with "discount override".
   */
  private async check(user: AuthenticatedUser, dto: UpsertHappyHourDto) {
    if (dto.startTime === dto.endTime) throw new BadRequestException('Shuru aur khatam ka waqt ek jaisa nahi ho sakta');
    const from = asDay(dto.validFrom);
    const to = asDay(dto.validTo);
    if (from && to && from > to) throw new BadRequestException('"Kab tak" ki tareekh "kab se" se pehle hai');
    const type = dto.discountType ?? 'PERCENTAGE';
    if (type === 'PERCENTAGE' && !(dto.discountValue > 0 && dto.discountValue <= 100)) throw new BadRequestException('Percent 1 se 100 ke beech likhein');
    if (type === 'FIXED' && !(dto.discountValue > 0)) throw new BadRequestException('Har plate par kitne rupay kam — 0 se zyada likhein');

    const categoryIds = [...new Set(dto.categoryIds ?? [])];
    const productIds = [...new Set(dto.productIds ?? [])];
    const [cats, prods] = await Promise.all([
      categoryIds.length ? this.prisma.category.count({ where: { id: { in: categoryIds }, tenantId: user.tenantId } }) : 0,
      productIds.length ? this.prisma.product.count({ where: { id: { in: productIds }, tenantId: user.tenantId } }) : 0,
    ]);
    if (cats !== categoryIds.length) throw new NotFoundException('Ek ya zyada category nahi mili');
    if (prods !== productIds.length) throw new NotFoundException('Ek ya zyada dish nahi mili');

    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { maxDiscountPercent: true } });
    const limit = settings?.maxDiscountPercent ?? 50;
    const trusted = hasPermission(user.role, user.permissions, PERMISSIONS.POS_DISCOUNT_OVERRIDE);
    if (!trusted && (dto.isActive ?? true)) {
      let pct = type === 'PERCENTAGE' ? dto.discountValue : type === 'BUY_ONE_GET_ONE' ? 50 : 0;
      if (type === 'FIXED') {
        // Measured on the cheapest dish the rule covers.
        const cheapest = await this.prisma.product.findFirst({
          where: {
            tenantId: user.tenantId, isActive: true, isRawMaterial: false, price: { gt: 0 },
            ...(productIds.length || categoryIds.length
              ? { OR: [...(productIds.length ? [{ id: { in: productIds } }] : []), ...(categoryIds.length ? [{ categoryId: { in: categoryIds } }] : [])] }
              : { menuItem: { isNot: null } }),
          },
          orderBy: { price: 'asc' },
          select: { price: true },
        });
        pct = cheapest ? Math.min(100, (dto.discountValue / cheapest.price) * 100) : 0;
      }
      if (pct > limit + 0.01) {
        throw new ForbiddenException(`Dukaan me discount ki had ${limit}% hai — is se zyada wala happy hour malik ya "Had se zyada discount" wala bana sakta hai`);
      }
    }
    return {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      discountType: type,
      discountValue: dto.discountValue,
      startTime: dto.startTime,
      endTime: dto.endTime,
      daysOfWeek: [...new Set(dto.daysOfWeek ?? [])].sort(),
      validFrom: from,
      validTo: to,
      categoryIds,
      productIds,
      minOrderAmount: dto.minOrderAmount || null,
      maxDiscount: dto.maxDiscount || null,
      orderModes: [...new Set(dto.orderModes ?? [])],
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
    };
  }

  async create(user: AuthenticatedUser, dto: UpsertHappyHourDto) {
    const data = await this.check(user, dto);
    return this.prisma.happyHourRule.create({ data: { ...data, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, activeOnly = false) {
    const rules = await this.prisma.happyHourRule.findMany({
      where: { tenantId: user.tenantId, ...(activeOnly && { isActive: true }) },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    const { tz } = await this.clock.clock(user.tenantId);
    const now = new Date();
    return rules.map((r) => ({ ...r, liveNow: r.isActive && this.runs(r, now, tz) }));
  }

  /** Whether the rule's days, dates and time window cover `at` in shop time. */
  private runs(r: HappyHourRule, at: Date, tz: string, mode?: RestaurantOrderMode) {
    const today = dateKeyTz(at, tz);
    if (r.validFrom && dateKeyTz(r.validFrom, tz) > today) return false;
    if (r.validTo && dateKeyTz(r.validTo, tz) < today) return false;
    if (mode && r.orderModes?.length && !r.orderModes.includes(mode)) return false;
    // A window past midnight (22:00–02:00) belongs to the day it started.
    const time = clockOf(at, tz);
    const overnight = r.startTime > r.endTime && time < r.endTime;
    const day = overnight ? (weekdayInTz(at, tz) + 6) % 7 : weekdayInTz(at, tz);
    if (r.daysOfWeek?.length && !r.daysOfWeek.includes(day)) return false;
    return inWindow(time, r.startTime, r.endTime);
  }

  async findActiveNow(user: AuthenticatedUser, mode?: RestaurantOrderMode) {
    const { tz } = await this.clock.clock(user.tenantId);
    const now = new Date();
    const rules = await this.prisma.happyHourRule.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: { displayOrder: 'asc' } });
    return rules.filter((r) => this.runs(r, now, tz, mode));
  }

  /**
   * Happy-hour discount for each bill line at `at`. Each line takes the one
   * rule that saves the most (rules do not stack); a rule's minimum bill and
   * its cap apply per bill. Prices are the menu prices before add-ons.
   */
  async priceLines(tenantId: string, lines: HappyLine[], opts: { mode?: RestaurantOrderMode; at?: Date } = {}) {
    const { tz } = await this.clock.clock(tenantId);
    const at = opts.at ?? new Date();
    const rules = (await this.prisma.happyHourRule.findMany({ where: { tenantId, isActive: true }, orderBy: { displayOrder: 'asc' } }))
      .filter((r) => this.runs(r, at, tz, opts.mode));
    const empty = { lines: lines.map((l) => ({ ...l, discount: 0, ruleId: null as string | null, ruleName: null as string | null })), discount: 0, rules: [] as Array<{ id: string; name: string; saved: number }> };
    if (!rules.length || !lines.length) return empty;

    const products = await this.prisma.product.findMany({ where: { tenantId, id: { in: [...new Set(lines.map((l) => l.productId))] } }, select: { id: true, categoryId: true } });
    const category = new Map(products.map((p) => [p.id, p.categoryId]));
    const billTotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

    const covers = (r: HappyHourRule, productId: string) => {
      if (!r.productIds.length && !r.categoryIds.length) return true;
      const cat = category.get(productId);
      return r.productIds.includes(productId) || (!!cat && r.categoryIds.includes(cat));
    };
    const saving = (r: HappyHourRule, l: HappyLine) => {
      const gross = l.unitPrice * l.quantity;
      if (r.discountType === 'FIXED') return Math.min(r.discountValue, l.unitPrice) * l.quantity;
      if (r.discountType === 'BUY_ONE_GET_ONE') return Math.floor(l.quantity / 2) * l.unitPrice;
      return (gross * r.discountValue) / 100;
    };

    // Best rule per line, then each rule's cap shared over its lines.
    const pick = lines.map((l) => {
      let best: { r: HappyHourRule; amount: number } | null = null;
      for (const r of rules) {
        if (r.minOrderAmount && billTotal < r.minOrderAmount) continue;
        if (!covers(r, l.productId)) continue;
        const amount = saving(r, l);
        if (amount > (best?.amount ?? 0)) best = { r, amount };
      }
      return best;
    });
    const scale = new Map<string, number>();
    for (const r of rules) {
      if (!r.maxDiscount) continue;
      const sum = pick.reduce((s, p) => s + (p?.r.id === r.id ? p.amount : 0), 0);
      if (sum > r.maxDiscount) scale.set(r.id, r.maxDiscount / sum);
    }
    const priced = lines.map((l, i) => {
      const p = pick[i];
      const discount = p ? round2(p.amount * (scale.get(p.r.id) ?? 1)) : 0;
      return { ...l, discount, ruleId: discount > 0 ? p!.r.id : null, ruleName: discount > 0 ? p!.r.name : null };
    });
    const used = new Map<string, { id: string; name: string; saved: number }>();
    for (const l of priced) {
      if (!l.ruleId) continue;
      const row = used.get(l.ruleId) ?? { id: l.ruleId, name: l.ruleName!, saved: 0 };
      row.saved = round2(row.saved + l.discount);
      used.set(l.ruleId, row);
    }
    return { lines: priced, discount: round2(priced.reduce((s, l) => s + l.discount, 0)), rules: [...used.values()] };
  }

  /** Prices given products at their menu price, for the counter screen. */
  async quote(user: AuthenticatedUser, items: Array<{ productId: string; quantity: number }>, mode?: RestaurantOrderMode) {
    const products = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(items.map((i) => i.productId))] } }, select: { id: true, price: true } });
    const price = new Map(products.map((p) => [p.id, Number(p.price || 0)]));
    return this.priceLines(user.tenantId, items.filter((i) => price.has(i.productId)).map((i) => ({ ...i, unitPrice: price.get(i.productId)! })), { mode });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertHappyHourDto) {
    const r = await this.prisma.happyHourRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Happy hour nahi mila');
    const data = await this.check(user, { ...dto, isActive: dto.isActive ?? r.isActive });
    return this.prisma.happyHourRule.update({ where: { id }, data });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.happyHourRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Happy hour nahi mila');
    // A rule that already gave discounts is switched off, so its totals stay.
    if (r.totalUsage > 0) return this.prisma.happyHourRule.update({ where: { id }, data: { isActive: false } });
    return this.prisma.happyHourRule.delete({ where: { id } });
  }

  async toggle(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.happyHourRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Happy hour nahi mila');
    // Switching back on re-checks the counter rules, which may have tightened since.
    if (!r.isActive) {
      await this.check(user, {
        ...r, discountType: r.discountType as UpsertHappyHourDto['discountType'], isActive: true,
        description: r.description ?? undefined, validFrom: r.validFrom?.toISOString(), validTo: r.validTo?.toISOString(),
        minOrderAmount: r.minOrderAmount ?? undefined, maxDiscount: r.maxDiscount ?? undefined,
      });
    }
    return this.prisma.happyHourRule.update({ where: { id }, data: { isActive: !r.isActive } });
  }
}
