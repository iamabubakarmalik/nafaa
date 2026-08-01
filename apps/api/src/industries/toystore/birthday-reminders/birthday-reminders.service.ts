import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RecordGiftPurchaseDto, UpsertBirthdayReminderDto } from './dto/upsert-birthday.dto';
import { ageGroupsForYears } from '../products/products.service';

/** Days until the NEXT occurrence of a birthday (ignores year) */
function daysUntilNextBirthday(birthDate: Date, from = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function ageInYears(birthDate: Date, at = new Date()): number {
  const ms = at.getTime() - new Date(birthDate).getTime();
  return Number((ms / (365.25 * 86400000)).toFixed(1));
}

@Injectable()
export class BirthdayRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertBirthdayReminderDto) {
    return this.prisma.toyBirthdayReminder.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        childBirthDate: new Date(dto.childBirthDate),
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
          turningAge: Math.floor(ageInYears(r.childBirthDate)) + 1,
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
          turningAge: Math.floor(ageInYears(r.childBirthDate)) + 1,
          shouldRemindNow: daysUntilNextBirthday(r.childBirthDate) <= r.reminderDaysBefore,
        },
      }))
      .filter((r) => r.computed.daysUntilBirthday <= days)
      .sort((a, b) => a.computed.daysUntilBirthday - b.computed.daysUntilBirthday);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Birthday reminder not found');

    return {
      ...r,
      computed: {
        currentAge: ageInYears(r.childBirthDate),
        daysUntilBirthday: daysUntilNextBirthday(r.childBirthDate),
        turningAge: Math.floor(ageInYears(r.childBirthDate)) + 1,
        avgSpend: r.totalPurchases > 0 ? r.totalSpent / r.totalPurchases : 0,
      },
    };
  }

  /** Auto gift suggestions: age-appropriate + gender + favourite categories + budget */
  async giftSuggestions(user: AuthenticatedUser, id: string, limit = 12) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Birthday reminder not found');

    const turningAge = Math.floor(ageInYears(r.childBirthDate)) + 1;
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
        ...(maxBudget ? { retailPrice: { lte: maxBudget } } : {}),
        ...(turningAge < 3 ? { chokingHazard: false } : {}),
      },
      orderBy: [{ isBirthdayGift: 'desc' }, { isBestSeller: 'desc' }, { totalSold: 'desc' }],
      take: limit * 2,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, stock: { gt: 0 } },
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
        ...(r.childGender ? { OR: [{ targetGender: r.childGender }, { targetGender: 'UNISEX' }] } : {}),
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
    if (!r) throw new NotFoundException('Birthday reminder not found');
    return this.prisma.toyBirthdayReminder.update({
      where: { id },
      data: { ...dto, childBirthDate: dto.childBirthDate ? new Date(dto.childBirthDate) : undefined },
    });
  }

  async recordPurchase(user: AuthenticatedUser, id: string, dto: RecordGiftPurchaseDto) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Birthday reminder not found');

    return this.prisma.toyBirthdayReminder.update({
      where: { id },
      data: {
        lastPurchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
        lastGiftGiven: dto.giftDescription,
        totalPurchases: { increment: 1 },
        totalSpent: { increment: dto.amount },
      },
    });
  }

  async markReminderSent(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Birthday reminder not found');
    return this.prisma.toyBirthdayReminder.update({ where: { id }, data: { lastReminderSent: new Date() } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.toyBirthdayReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Birthday reminder not found');
    return this.prisma.toyBirthdayReminder.delete({ where: { id } });
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
