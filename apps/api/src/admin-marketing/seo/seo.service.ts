import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination, paginated } from '../_shared/helpers/pagination.helper';

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async listPages(dto: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = parsePagination(dto);
    const where: any = {};
    if (dto.search) {
      where.OR = [
        { path: { contains: dto.search, mode: 'insensitive' } },
        { title: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.seoPage.findMany({
        where, skip, take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.seoPage.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  async getPage(id: string) {
    const p = await this.prisma.seoPage.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('SEO page not found');
    return p;
  }

  async upsertPage(
    path: string,
    data: {
      title?: string;
      description?: string;
      keywords?: string[];
      ogImage?: string;
      canonicalUrl?: string;
      robots?: string;
    },
    adminId: string,
  ) {
    if (!path) throw new BadRequestException('path is required');
    const p = await this.prisma.seoPage.upsert({
      where: { path },
      create: {
        path,
        title: data.title,
        metaDescription: data.description,
        metaKeywords: data.keywords ?? [],
        canonicalUrl: data.canonicalUrl,
      },
      update: {
        title: data.title,
        metaDescription: data.description,
        ...(data.keywords && { metaKeywords: data.keywords }),
        canonicalUrl: data.canonicalUrl,
      },
    });
    await this.prisma.activityLog.create({
      data: {
        userId: adminId, tenantId: "system",
        action: 'SEO_PAGE_UPSERTED',
        description: 'SEO_PAGE_UPSERTED',
        entityType: 'SeoPage',
        entityId: p.id,
        metadata: { path } as any,
      },
    });
    return p;
  }

  async keywordRankings() {
    return this.prisma.seoKeyword.findMany({
      orderBy: [{ currentPosition: 'asc' }],
      take: 100,
    });
  }

  async seoScore() {
    const [total, missing, weak] = await Promise.all([
      this.prisma.seoPage.count(),
      this.prisma.seoPage.count({
        where: { OR: [{ title: null }, { metaDescription: null }] },
      }),
      this.prisma.seoPage.count({
        where: {
          OR: [
            { title: { equals: '' } },
            { metaDescription: { equals: '' } },
          ],
        },
      }),
    ]);
    const score =
      total > 0 ? Math.max(0, 100 - Math.round(((missing + weak) / total) * 100)) : 0;
    return { totalPages: total, missing, weak, score };
  }
}
