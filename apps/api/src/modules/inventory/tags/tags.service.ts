/**
 * Product tags: list, figures for a period, create, edit, merge and delete.
 * Names are unique per shop ignoring case. A product can carry many tags, so
 * a product counts once under each of its tags.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { cleanName, mergeInto, nameTaken, periodRange, sameName, taxonomyInsights } from '../taxonomy/taxonomy.helper';
import { UpdateTagDto, UpsertTagDto } from './dto/upsert-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private async own(user: AuthenticatedUser, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, tenantId: user.tenantId }, include: { _count: { select: { products: true } } } });
    if (!tag) throw new NotFoundException('Tag nahi mila');
    return tag;
  }

  private async assertFree(tenantId: string, name: string, exceptId?: string) {
    const hit = await this.prisma.tag.findFirst({
      where: { tenantId, name: sameName(name), ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (hit) nameTaken('tag');
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.tag.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  /** Every tag with its figures for the period (default: last 30 days). */
  async insights(user: AuthenticatedUser, from?: string, to?: string) {
    const range = await periodRange(this.tz, user.tenantId, from, to);
    const [rows, data] = await Promise.all([
      this.prisma.tag.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: 'asc' } }),
      taxonomyInsights(this.prisma, user.tenantId, 'tag', range),
    ]);
    const items = rows.map((t) => ({ ...t, isActive: true, stats: data.stats.get(t.id) ?? null }));
    return {
      items,
      totals: {
        count: rows.length,
        active: rows.length,
        unlinked: data.unlinked,
        totalProducts: data.totalProducts,
        revenue: items.reduce((s, i) => s + (i.stats?.revenue ?? 0), 0),
        stockValue: items.reduce((s, i) => s + (i.stats?.stockValue ?? 0), 0),
      },
    };
  }

  async create(user: AuthenticatedUser, dto: UpsertTagDto) {
    const name = cleanName(dto.name);
    await this.assertFree(user.tenantId, name);
    return this.prisma.tag.create({ data: { tenantId: user.tenantId, name, color: dto.color ?? '#16a34a' } });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTagDto) {
    await this.own(user, id);
    const name = dto.name !== undefined ? cleanName(dto.name) : undefined;
    if (name) await this.assertFree(user.tenantId, name, id);
    return this.prisma.tag.update({
      where: { id },
      data: { ...(name && { name }), ...(dto.color !== undefined && { color: dto.color }) },
    });
  }

  async merge(user: AuthenticatedUser, id: string, intoId: string) {
    if (id === intoId) throw new BadRequestException('Usi tag me nahi mila sakte');
    const [from, into] = await Promise.all([this.own(user, id), this.own(user, intoId)]);
    const moved = await mergeInto(this.prisma, 'tag', from.id, into.id);
    return { moved, message: `${moved} products par ab "${into.name}" laga hai` };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const tag = await this.own(user, id);
    await this.prisma.tag.delete({ where: { id } });
    return { freed: tag._count.products, message: 'Tag mit gaya — products wahi rahe, sirf tag hata' };
  }
}
