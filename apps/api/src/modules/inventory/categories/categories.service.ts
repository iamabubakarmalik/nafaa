/**
 * Product categories: list, figures for a period, create, edit, switch off,
 * merge into another and delete. Categories form a tree through `parentId`
 * (any depth) with a sibling order. Names are unique per shop ignoring case.
 * Deleting moves sub-categories up to the parent and leaves the products
 * without a category; nothing else is lost.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { cleanName, mergeInto, nameTaken, periodRange, sameName, taxonomyInsights } from '../taxonomy/taxonomy.helper';
import { CreateCategoryDto, ReorderCategoriesDto, UpdateCategoryDto } from './dto/create-category.dto';
import { wouldLoop } from './category-tree';
import { apiMessage } from '../../../common/i18n/api-message';

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

  /** Checks a parent for `id` (null for a new category): same tenant and no loop. */
  private async checkParent(user: AuthenticatedUser, parentId: string | null | undefined, id: string | null) {
    if (!parentId) return null;
    if (parentId === id) throw new BadRequestException('Category apne andar nahi ja sakti');
    const rows = await this.prisma.category.findMany({ where: { tenantId: user.tenantId }, select: { id: true, parentId: true, name: true } });
    if (!rows.some((r) => r.id === parentId)) throw new NotFoundException('Upar wali category nahi mili');
    if (id && wouldLoop(rows, id, parentId)) throw new BadRequestException('Category apni hi sub-category ke andar nahi ja sakti');
    return parentId;
  }

  async create(user: AuthenticatedUser, dto: CreateCategoryDto) {
    const name = cleanName(dto.name);
    await this.assertFree(user, name);
    const parentId = await this.checkParent(user, dto.parentId, null);
    const last = await this.prisma.category.aggregate({ where: { tenantId: user.tenantId, parentId }, _max: { sortOrder: true } });
    return this.prisma.category.create({
      data: {
        tenantId: user.tenantId, name, color: dto.color ?? '#2c9466', icon: dto.icon || null, isActive: dto.isActive ?? true,
        parentId, sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  }

  /** Every category in tree order (parents before children, siblings by their order). */
  async findAll(user: AuthenticatedUser) {
    return this.prisma.category.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true, children: true } } },
    });
  }

  /** Saves a drag on the categories page: each moved row's parent and sibling position. */
  async reorder(user: AuthenticatedUser, dto: ReorderCategoriesDto) {
    const rows = await this.prisma.category.findMany({ where: { tenantId: user.tenantId }, select: { id: true, parentId: true, name: true } });
    const byId = new Map(rows.map((r) => [r.id, { ...r }]));
    for (const it of dto.items) {
      if (!byId.has(it.id)) throw new NotFoundException('Category nahi mili');
      if (it.parentId && !byId.has(it.parentId)) throw new NotFoundException('Upar wali category nahi mili');
    }
    // Apply all moves first, then check the whole tree for loops.
    for (const it of dto.items) if (it.parentId !== undefined) byId.get(it.id)!.parentId = it.parentId || null;
    const next = [...byId.values()];
    for (const it of dto.items) {
      const r = byId.get(it.id)!;
      if (r.parentId === r.id || (r.parentId && wouldLoop(next.map((x) => (x.id === r.id ? { ...x, parentId: null } : x)), r.id, r.parentId))) {
        throw new BadRequestException('Category apni hi sub-category ke andar nahi ja sakti');
      }
    }
    await this.prisma.$transaction(dto.items.map((it) => this.prisma.category.update({
      where: { id: it.id },
      data: { sortOrder: it.sortOrder, ...(it.parentId !== undefined && { parentId: it.parentId || null }) },
    })));
    return { updated: dto.items.length };
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
    const parentId = dto.parentId !== undefined ? await this.checkParent(user, dto.parentId, id) : undefined;
    // Moved under another parent: goes to the end of its new siblings.
    const last = parentId !== undefined
      ? await this.prisma.category.aggregate({ where: { tenantId: user.tenantId, parentId, id: { not: id } }, _max: { sortOrder: true } })
      : null;
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.icon !== undefined && { icon: dto.icon || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(parentId !== undefined && { parentId, sortOrder: (last?._max.sortOrder ?? -1) + 1 }),
      },
    });
  }

  async merge(user: AuthenticatedUser, id: string, intoId: string) {
    if (id === intoId) throw new BadRequestException('Usi category me nahi mila sakte');
    const [from, into] = await Promise.all([this.own(user, id), this.own(user, intoId)]);
    if (into.parentId && (await this.prisma.category.findMany({ where: { tenantId: user.tenantId }, select: { id: true, parentId: true, name: true } }).then((rows) => wouldLoop(rows, from.id, into.id)))) {
      throw new BadRequestException('Category ko apni hi sub-category me nahi mila sakte');
    }
    await this.prisma.category.updateMany({ where: { tenantId: user.tenantId, parentId: from.id }, data: { parentId: into.id } });
    const moved = await mergeInto(this.prisma, 'category', from.id, into.id);
    return { moved, ...apiMessage('{{moved}} products "{{intoName}}" me chale gaye', { moved, intoName: into.name }) };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const cat = await this.own(user, id);
    const freed = await this.prisma.product.count({ where: { categoryId: id } });
    await this.prisma.$transaction([
      // Sub-categories move up one level instead of becoming top level.
      this.prisma.category.updateMany({ where: { tenantId: user.tenantId, parentId: id }, data: { parentId: cat.parentId } }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return { freed, ...(freed ? apiMessage('Category mit gayi — {{freed}} products ab bina category hain', { freed }) : apiMessage('Category mit gayi')) };
  }
}
