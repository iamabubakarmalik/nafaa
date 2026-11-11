import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginated, parsePagination } from '../_shared/helpers/pagination.helper';

@Injectable()
export class HeatmapsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Without paging params the first 100 pages are returned (old behaviour). */
  async listPages(dto: { page?: number | string; limit?: number | string; search?: string } = {}) {
    const paged = dto.page !== undefined || dto.limit !== undefined;
    const { page, limit, skip } = parsePagination({ page: Number(dto.page) || 1, limit: Number(dto.limit) || (paged ? 25 : 100) });
    const like = dto.search ? `%${dto.search.replace(/[%_\\]/g, '\\$&')}%` : '%';
    const rows = await this.prisma.$queryRaw<
      { path: string; sessions: bigint; avg_scroll: number | null }[]
    >`
      SELECT
        path,
        COUNT(DISTINCT "sessionId")::bigint AS sessions,
        AVG(COALESCE("scrollDepth", 0))::float AS avg_scroll
      FROM "HeatmapSession"
      WHERE path ILIKE ${like}
      GROUP BY path
      ORDER BY sessions DESC
      LIMIT ${limit} OFFSET ${skip};
    `;
    const items = rows.map((r) => ({
      path: r.path,
      sessions: Number(r.sessions),
      avgScrollDepth: Math.round(r.avg_scroll ?? 0),
    }));
    if (!paged) return items;
    const totalRows = await this.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT path)::bigint AS n FROM "HeatmapSession" WHERE path ILIKE ${like};
    `;
    return paginated(items, Number(totalRows[0]?.n ?? 0), page, limit);
  }

  async pageClicks(path: string) {
    return this.prisma.heatmapSession.findMany({
      where: { path },
      select: { path: true, clicks: true, scrollDepth: true, moves: true },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    });
  }

  async scrollDepth(path: string) {
    const rows = await this.prisma.$queryRaw<
      { bucket: number; count: bigint }[]
    >`
      SELECT
        (FLOOR(COALESCE("scrollDepth", 0) / 10) * 10)::int AS bucket,
        COUNT(*)::bigint AS count
      FROM "HeatmapSession"
      WHERE path = ${path}
      GROUP BY bucket
      ORDER BY bucket ASC;
    `;
    return rows.map((r) => ({ bucket: r.bucket, count: Number(r.count) }));
  }
}
