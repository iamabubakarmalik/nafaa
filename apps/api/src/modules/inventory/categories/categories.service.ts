/**
 * Product categories: list, figures for a period, create, edit, switch off,
 * merge into another and delete. Names are unique per shop ignoring case.
 * Deleting leaves the products without a category; nothing else is lost.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { cleanName, mergeInto, nameTaken, periodRange, sameName, taxonomyInsights } from '../taxonomy/taxonomy.helper';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private async own(user: AuthenticatedUser, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!cat) throw new NotFoundException('Category nahi mili');
    return cat;
  }

  private async assertFree(user: AuthenticatedUser, name: string, exceptId?: string) {
    const hit = await this.prisma.category.findFirst({
      where: { tenantId: user.tenantId, name: sameName(name), ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (hit) nameTaken('category');
  }

  async create(user: AuthenticatedUser, dto: CreateCategoryDto) {
    const name = cleanName(dto.name);
    await this.assertFree(user, name);
    return this.prisma.category.create({
      data: { tenantId: user.tenantId, name, color: dto.color ?? '#2c9466', icon: dto.icon || null, isActive: dto.isActive ?? true },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.category.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { products: true } } },
    });
  }

  /** Every category with its figures for the period (default: last 30 days). */
  async insights(user: AuthenticatedUser, from?: string, to?: string) {
    const range = await periodRange(this.tz, user.tenantId, from, to);
    const [rows, data] = await Promise.all([
      this.prisma.category.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: 'asc' } }),
      taxonomyInsights(this.prisma, user.tenantId, 'category', range),
    ]);
    const items = rows.map((c) => ({ ...c, stats: data.stats.get(c.id) ?? null }));
    return {
      items,
      totals: {
        count: rows.length,
        active: rows.filter((c) => c.isActive).length,
        unlinked: data.unlinked,
        totalProducts: data.totalProducts,
        revenue: items.reduce((s, i) => s + (i.stats?.revenue ?? 0), 0),
        stockValue: items.reduce((s, i) => s + (i.stats?.stockValue ?? 0), 0),
      },
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCategoryDto) {
    await this.own(user, id);
    const name = dto.name !== undefined ? cleanName(dto.name) : undefined;
    if (name) await this.assertFree(user, name, id);
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.icon !== undefined && { icon: dto.icon || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async merge(user: AuthenticatedUser, id: string, intoId: string) {
    if (id === intoId) throw new BadRequestException('Usi category me nahi mila sakte');
    const [from, into] = await Promise.all([this.own(user, id), this.own(user, intoId)]);
    const moved = await mergeInto(this.prisma, 'category', from.id, into.id);
    return { moved, message: `${moved} products "${into.name}" me chale gaye` };
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.own(user, id);
    const freed = await this.prisma.product.count({ where: { categoryId: id } });
    await this.prisma.category.delete({ where: { id } });
    return { freed, message: freed ? `Category mit gayi — ${freed} products ab bina category hain` : 'Category mit gayi' };
  }
}
