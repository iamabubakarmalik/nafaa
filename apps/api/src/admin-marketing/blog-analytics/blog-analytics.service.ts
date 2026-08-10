import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlogAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(range: { from?: string; to?: string }) {
    const from = range.from ? new Date(range.from) : new Date(Date.now() - 30 * 864e5);
    const to = range.to ? new Date(range.to) : new Date();

    const [posts, totalViews, totalReads, avgTime] = await Promise.all([
      this.prisma.blogPostAnalytics.count({ where: { publishedAt: { not: null } } }),
      this.prisma.blogPostAnalytics.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.blogPostAnalytics.count({
        where: {
          createdAt: { gte: from, lte: to },
          // readCompleted removed,
        },
      }),
      this.prisma.blogPostAnalytics.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _avg: { avgTimeOnPage: true },
      }),
    ]);

    return {
      publishedPosts: posts,
      totalViews,
      totalReads,
      readRate:
        totalViews > 0 ? `${((totalReads / totalViews) * 100).toFixed(1)}%` : '0%',
      averageReadTimeSec: Math.round(avgTime._avg?.avgTimeOnPage ?? 0),
    };
  }

  async topPosts(range: { from?: string; to?: string; limit?: number }) {
    const from = range.from ? new Date(range.from) : new Date(Date.now() - 30 * 864e5);
    const to = range.to ? new Date(range.to) : new Date();

    const raw = await this.prisma.blogPostAnalytics.groupBy({
      by: ['postSlug'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      orderBy: { _count: { postSlug: 'desc' } },
      take: range.limit ?? 20,
    });

    const posts = await this.prisma.blogPostAnalytics.findMany({
      where: { id: { in: raw.map((r) => r.postSlug) } },
      select: { id: true, postTitle: true, postSlug: true, publishedAt: true },
    });
    const map = new Map(posts.map((p) => [p.id, p]));
    return raw.map((r) => ({
      postId: r.postSlug,
      views: r._count,
      post: map.get(r.postSlug),
    }));
  }
}
