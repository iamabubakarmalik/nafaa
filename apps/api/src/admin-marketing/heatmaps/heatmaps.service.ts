import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HeatmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPages() {
    // Distinct paths with recorded clicks
    const rows = await this.prisma.$queryRaw<
      { path: string; clicks: bigint; sessions: bigint }[]
    >`
      SELECT
        path,
        COUNT(*)::bigint AS clicks,
        COUNT(DISTINCT "sessionId")::bigint AS sessions
      FROM "HeatmapClick"
      GROUP BY path
      ORDER BY clicks DESC
      LIMIT 100;
    `;
    return rows.map((r) => ({
      path: r.path,
      clicks: Number(r.clicks),
      sessions: Number(r.sessions),
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
        (FLOOR("scrollDepthPercent" / 10) * 10)::int AS bucket,
        COUNT(*)::bigint AS count
      FROM "ScrollEvent"
      WHERE path = ${path}
      GROUP BY bucket
      ORDER BY bucket ASC;
    `;
    return rows.map((r) => ({ bucket: r.bucket, count: Number(r.count) }));
  }
}
