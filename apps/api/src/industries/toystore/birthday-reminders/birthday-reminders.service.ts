import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, tzParts } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RecordGiftPurchaseDto, UpsertBirthdayReminderDto } from './dto/upsert-birthday.dto';
import { ageGroupsForYears } from '../products/products.service';

/** Days until the NEXT occurrence of a birthday (ignores year) */
function daysUntilNextBirthday(birthDate: Date, from = new Date()): number {
  // "Today" is the shop's day (Pakistan time); the birth date is a calendar date stored at UTC midnight.
  const t = tzParts(from);
  const today = Date.UTC(t.year, t.month - 1, t.day);
  const b = new Date(birthDate);
  let next = Date.UTC(t.year, b.getUTCMonth(), b.getUTCDate());
  if (next < today) next = Date.UTC(t.year + 1, b.getUTCMonth(), b.getUTCDate());
  return Math.round((next - today) / 86400000);
}

function ageInYears(birthDate: Date, at = new Date()): number {
  const t = tzParts(at);
  const ms = Date.UTC(t.year, t.month - 1, t.day) - new Date(birthDate).getTime();
  return Number((ms / (365.25 * 86400000)).toFixed(1));
}

/** Age the child turns on the next birthday (today counts when it is the day). */
export function turningAgeOf(birthDate: Date, from = new Date()): number {
  const t = tzParts(from);
  const b = new Date(birthDate);
  const passed = t.month - 1 > b.getUTCMonth() || (t.month - 1 === b.getUTCMonth() && t.day > b.getUTCDate());
  return t.year - b.getUTCFullYear() + (passed ? 1 : 0);
}

/** A birth date is a calendar day, kept at UTC midnight; it may not be in the future. */
function birthDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!m) throw new BadRequestException('Bachay ki paidaish ki tareekh likhein');
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const t = tzParts(new Date());
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.UTC(t.year, t.month - 1, t.day)) throw new BadRequestException('Paidaish ki tareekh aage ki nahi ho sakti');
  if (t.year - d.getUTCFullYear() > 18) throw new BadRequestException('Bachay ki umar 18 saal se kam honi chahiye');
  return d;
}

@Injectable()
export class BirthdayRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  /** A linked customer must be this shop's own. */
  private async checkCustomer(user: AuthenticatedUser, customerId?: string) {
    if (!customerId) return;
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
  }

  async create(user: AuthenticatedUser, dto: UpsertBirthdayReminderDto) {
    await this.checkCustomer(user, dto.customerId);
    if (!dto.childName?.trim() || !dto.customerName?.trim()) throw new BadRequestException('Bachay aur walid ka naam likhein');
    return this.prisma.toyBirthdayReminder.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        customerId: dto.customerId || null,
        childBirthDate: birthDate(dto.childBirthDate),
        childInterests: dto.childInterests ?? [],
        favoriteCategories: dto.favoriteCategories ?? [],
      },
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; customerId?: string; gender?: string; search?: string }) {
    const rows = await this.prisma.toyBirthdayReminder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.gender && { childGender: params.gender as any }),
        ...(params.search && {
          OR: [
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { childName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      take: 300,
    });

    return rows
      .map((r) => ({
        ...r,
        computed: {
          currentAge: ageInYears(r.childBirthDate),
          daysUntilBirthday: daysUntilNextBirthday(r.childBirthDate),
          turningAge: turningAgeOf(r.childBirthDate),
        },
      }))
      .sort((a, b) => a.computed.daysUntilBirthday - b.computed.daysUntilBirthday);
  }

  /** Birthdays coming up within N days — the money-maker endpoint */
  async upcoming(user: AuthenticatedUser, days = 30) {
    const all = await this.prisma.toyBirthdayReminder.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      take: 1000,
    });

    return all
      .map((r) => ({
        ...r,
        computed: {
          currentAge: ageInYears(r.childBirthDate),
          daysUntilBirthday: daysUntilNextBirthday(r.childBirthDate),
          turningAge: turningAgeOf(r.childBirthDate),
          shouldRemindNow: daysUntilNextBirthday(r.childBirthDate) <= r.reminderDaysBefore,
        },
      }))
      .filter((r) => r.computed.daysUntilBirthday <= days)
      .sort((a, b) => a.computed.daysUntilBirthday - b.computed.daysUntilBirthday);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Bacha nahi mila');

    return {
      ...r,
      computed: {
        currentAge: ageInYears(r.childBirthDate),
        daysUntilBirthday: daysUntilNextBirthday(r.childBirthDate),
        turningAge: turningAgeOf(r.childBirthDate),
        avgSpend: r.totalPurchases > 0 ? r.totalSpent / r.totalPurchases : 0,
      },
    };
  }

  /** Auto gift suggestions: age-appropriate + gender + favourite categories + budget */
  async giftSuggestions(user: AuthenticatedUser, id: string, limit = 12) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Bacha nahi mila');

    const turningAge = turningAgeOf(r.childBirthDate);
    const groups = ageGroupsForYears(turningAge);

    // Parse budget "1000-3000" style
    let maxBudget: number | undefined;
    if (r.budgetRange) {
      const nums = r.budgetRange.match(/\d+/g);
      if (nums?.length) maxBudget = Number(nums[nums.length - 1]);
    }

    const profiles = await this.prisma.toyProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { ageGroup: { in: groups as any } },
          { ageGroups: { hasSome: groups as any } },
          { AND: [{ ageMinYears: { lte: turningAge } }, { ageMaxYears: { gte: turningAge } }] },
        ],
        ...(r.childGender && r.childGender !== 'UNISEX'
          ? { genderTarget: { in: [r.childGender, 'UNISEX'] as any } }
          : {}),
        ...(r.favoriteCategories.length ? { categoryType: { in: r.favoriteCategories as any } } : {}),
        ...(turningAge < 3 ? { chokingHazard: false } : {}),
      },
      orderBy: [{ isBirthdayGift: 'desc' }, { isBestSeller: 'desc' }, { totalSold: 'desc' }],
      take: limit * 2,
    });

    const productIds = profiles.map((p) => p.productId);
    // Budget is checked on the selling price the counter uses.
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId, id: { in: productIds }, isActive: true, stock: { gt: 0 },
        ...(maxBudget ? { price: { lte: maxBudget } } : {}),
      },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    const suggestions = profiles
      .filter((p) => map.has(p.productId))
      .slice(0, limit)
      .map((p) => ({ ...p, product: map.get(p.productId) }));

    // Also suggest matching gift packs
    const giftPacks = await this.prisma.toyGiftPack.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        // Packs with no gender set suit everyone; packs outside their dates are not on the counter.
        AND: [
          ...(r.childGender ? [{ OR: [{ targetGender: r.childGender }, { targetGender: 'UNISEX' as const }, { targetGender: null }] }] : []),
          { OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
        ],
        ...(maxBudget ? { giftPackPrice: { lte: maxBudget } } : {}),
      },
      orderBy: { totalSold: 'desc' },
      take: 5,
    });

    return {
      child: { name: r.childName, turningAge, gender: r.childGender, interests: r.childInterests },
      budgetCeiling: maxBudget ?? null,
      lastGiftGiven: r.lastGiftGiven,
      matchedAgeGroups: groups,
      products: suggestions,
      giftPacks,
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertBirthdayReminderDto) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Bacha nahi mila');
    await this.checkCustomer(user, dto.customerId);
    return this.prisma.toyBirthdayReminder.update({
      where: { id },
      data: { ...dto, customerId: dto.customerId || null, childBirthDate: dto.childBirthDate ? birthDate(dto.childBirthDate) : undefined },
    });
  }

  async recordPurchase(user: AuthenticatedUser, id: string, dto: RecordGiftPurchaseDto) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Bacha nahi mila');
    if (!(Number(dto.amount) >= 0)) throw new BadRequestException('Amount sahi likhein');

    return this.prisma.toyBirthdayReminder.update({
      where: { id },
      data: {
        lastPurchaseDate: dto.purchaseDate ? startOfDayTz(new Date(dto.purchaseDate)) : new Date(),
        lastGiftGiven: dto.giftDescription,
        totalPurchases: { increment: 1 },
        totalSpent: { increment: dto.amount },
      },
    });
  }

  async markReminderSent(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Bacha nahi mila');
    return this.prisma.toyBirthdayReminder.update({ where: { id }, data: { lastReminderSent: new Date() } });
  }

  /** Stops reminders for this child; the record and purchase history stay. */
  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Bacha nahi mila');
    return this.prisma.toyBirthdayReminder.update({ where: { id }, data: { isActive: false } });
  }

  async summary(user: AuthenticatedUser) {
    const all = await this.prisma.toyBirthdayReminder.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      take: 1000,
    });

    const thisWeek = all.filter((r) => daysUntilNextBirthday(r.childBirthDate) <= 7).length;
    const thisMonth = all.filter((r) => daysUntilNextBirthday(r.childBirthDate) <= 30).length;
    const needsReminder = all.filter((r) => daysUntilNextBirthday(r.childBirthDate) <= r.reminderDaysBefore).length;
    const totalSpent = all.reduce((s, r) => s + r.totalSpent, 0);
    const totalPurchases = all.reduce((s, r) => s + r.totalPurchases, 0);

    return {
      totalRegistered: all.length,
      birthdaysThisWeek: thisWeek,
      birthdaysThisMonth: thisMonth,
      needsReminderNow: needsReminder,
      lifetimeRevenue: totalSpent,
      totalPurchases,
      avgSpendPerPurchase: totalPurchases ? Number((totalSpent / totalPurchases).toFixed(0)) : 0,
    };
  }
}
