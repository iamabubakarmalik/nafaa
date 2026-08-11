import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HeatmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPages() {
    const rows = await this.prisma.$queryRaw<
      { path: string; sessions: bigint; avg_scroll: number | null }[]
    >`
      SELECT
        path,
        COUNT(DISTINCT "sessionId")::bigint AS sessions,
        AVG(COALESCE("scrollDepth", 0))::float AS avg_scroll
      FROM "HeatmapSession"
      GROUP BY path
      ORDER BY sessions DESC
      LIMIT 100;
    `;
    return rows.map((r) => ({
      path: r.path,
      sessions: Number(r.sessions),
      avgScrollDepth: Math.round(r.avg_scroll ?? 0),
    }));
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
