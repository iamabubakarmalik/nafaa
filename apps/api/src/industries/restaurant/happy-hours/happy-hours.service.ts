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

/** A rule's own discount on one line, before its per-bill cap. */
function lineSaving(r: Pick<HappyHourRule, 'discountType' | 'discountValue'>, l: HappyLine) {
  if (r.discountType === 'FIXED') return Math.min(r.discountValue, l.unitPrice) * l.quantity;
  if (r.discountType === 'BUY_ONE_GET_ONE') return Math.floor(l.quantity / 2) * l.unitPrice;
  return (l.unitPrice * l.quantity * r.discountValue) / 100;
}

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

    // Best rule per line, then each rule's cap shared over its lines.
    const pick = lines.map((l) => {
      let best: { r: HappyHourRule; amount: number } | null = null;
      for (const r of rules) {
        if (r.minOrderAmount && billTotal < r.minOrderAmount) continue;
        if (!covers(r, l.productId)) continue;
        const amount = lineSaving(r, l);
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

  /**
   * What each rule saved on a bill, for its usage counters. A bill line
   * keeps the rule that priced it, not the amount, so a line's saving is
   * the rule's own discount on it, never more than the line's discount;
   * the rule's cap holds per bill.
   */
  async billSavings(tenantId: string, lines: Array<{ happyHourRuleId: string | null; basePrice: number; quantity: number; itemDiscount: number }>) {
    const ids = [...new Set(lines.map((l) => l.happyHourRuleId).filter(Boolean) as string[])];
    if (!ids.length) return [];
    const rules = await this.prisma.happyHourRule.findMany({ where: { id: { in: ids }, tenantId } });
    return rules.map((r) => {
      let saved = lines
        .filter((l) => l.happyHourRuleId === r.id)
        .reduce((sum, l) => sum + Math.min(l.itemDiscount, lineSaving(r, { productId: '', quantity: l.quantity, unitPrice: l.basePrice })), 0);
      if (r.maxDiscount) saved = Math.min(saved, r.maxDiscount);
      return { id: r.id, saved: round2(saved) };
    }).filter((r) => r.saved > 0);
  }

  /** Prices given products at their menu (or size) price, for the counter screen. */
  async quote(user: AuthenticatedUser, items: Array<{ productId: string; quantity: number; variantId?: string }>, mode?: RestaurantOrderMode) {
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: [...new Set(items.map((i) => i.productId))] } },
      select: { id: true, price: true, variants: { select: { id: true, price: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const priceOf = (i: { productId: string; variantId?: string }) => {
      const p = byId.get(i.productId)!;
      return Number((i.variantId && p.variants.find((v) => v.id === i.variantId)?.price) || p.price || 0);
    };
    return this.priceLines(user.tenantId, items.filter((i) => byId.has(i.productId))
      .map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: priceOf(i) })), { mode });
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
    // A rule that already gave discounts (or priced a line still open) is switched off, so its totals stay.
    const priced = r.totalUsage > 0 || (await this.prisma.restaurantOrderItem.count({ where: { happyHourRuleId: id } })) > 0;
    if (priced) return this.prisma.happyHourRule.update({ where: { id }, data: { isActive: false } });
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
