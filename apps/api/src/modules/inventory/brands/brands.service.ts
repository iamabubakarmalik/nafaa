/**
 * Brands: list, figures for a period, create, edit, merge and delete. Names
 * are unique per shop ignoring case; the slug keeps Urdu and other letters,
 * so a brand named in Urdu gets a proper slug instead of an empty one.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { cleanName, mergeInto, nameTaken, periodRange, sameName, taxonomyInsights } from '../taxonomy/taxonomy.helper';
import { UpdateBrandDto, UpsertBrandDto } from './dto/upsert-brand.dto';

export function toSlug(name: string) {
  return name.normalize('NFKC').toLowerCase().trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'brand';
}

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** A slug no other brand of this shop uses ("lux", "lux-2", ...). */
  private async freeSlug(tenantId: string, name: string, exceptId?: string) {
    const base = toSlug(name);
    const taken = new Set((await this.prisma.brand.findMany({
      where: { tenantId, slug: { startsWith: base }, ...(exceptId && { id: { not: exceptId } }) },
      select: { slug: true },
    })).map((b) => b.slug));
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    return slug;
  }

  private async assertFree(tenantId: string, name: string, exceptId?: string) {
    const hit = await this.prisma.brand.findFirst({
      where: { tenantId, name: sameName(name), ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (hit) nameTaken('brand');
  }

  async list(user: AuthenticatedUser, search?: string) {
    return this.prisma.brand.findMany({
      where: {
        tenantId: user.tenantId,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand nahi mila');
    return brand;
  }

  /** Every brand with its figures for the period (default: last 30 days). */
  async insights(user: AuthenticatedUser, from?: string, to?: string) {
    const range = await periodRange(this.tz, user.tenantId, from, to);
    const [rows, data] = await Promise.all([
      this.prisma.brand.findMany({ where: { tenantId: user.tenantId }, orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }] }),
      taxonomyInsights(this.prisma, user.tenantId, 'brand', range),
    ]);
    const items = rows.map((b) => ({ ...b, stats: data.stats.get(b.id) ?? null }));
    return {
      items,
      totals: {
        count: rows.length,
        active: rows.filter((b) => b.isActive).length,
        unlinked: data.unlinked,
        totalProducts: data.totalProducts,
        revenue: items.reduce((s, i) => s + (i.stats?.revenue ?? 0), 0),
        stockValue: items.reduce((s, i) => s + (i.stats?.stockValue ?? 0), 0),
      },
    };
  }

  async create(user: AuthenticatedUser, dto: UpsertBrandDto) {
    const name = cleanName(dto.name);
    await this.assertFree(user.tenantId, name);
    return this.prisma.brand.create({
      data: {
        ...dto,
        name,
        tenantId: user.tenantId,
        slug: await this.freeSlug(user.tenantId, name),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateBrandDto) {
    const brand = await this.getOne(user, id);
    const name = dto.name !== undefined ? cleanName(dto.name) : undefined;
    if (name && name !== brand.name) await this.assertFree(user.tenantId, name, id);
    return this.prisma.brand.update({
      where: { id },
      data: {
        ...dto,
        ...(name && { name, slug: await this.freeSlug(user.tenantId, name, id) }),
      },
    });
  }

  async merge(user: AuthenticatedUser, id: string, intoId: string) {
    if (id === intoId) throw new BadRequestException('Usi brand me nahi mila sakte');
    const [from, into] = await Promise.all([this.getOne(user, id), this.getOne(user, intoId)]);
    const moved = await mergeInto(this.prisma, 'brand', from.id, into.id);
    return { moved, message: `${moved} products "${into.name}" me chale gaye` };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const brand = await this.getOne(user, id);
    await this.prisma.brand.delete({ where: { id } });
    const freed = brand._count.products;
    return { freed, message: freed ? `Brand mit gaya — ${freed} products ab bina brand hain` : 'Brand mit gaya' };
  }
}
