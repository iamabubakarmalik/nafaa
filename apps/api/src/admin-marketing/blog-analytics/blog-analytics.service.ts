import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlogAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // BlogPostAnalytics is a per-post AGGREGATE table (postSlug @unique),
  // not an event log — use _sum/_avg, not row counts.
  async overview(_range: { from?: string; to?: string }) {
    const [posts, agg] = await Promise.all([
      this.prisma.blogPostAnalytics.count({
        where: { publishedAt: { not: null } },
      }),
      this.prisma.blogPostAnalytics.aggregate({
        _sum: {
          totalViews: true,
          uniqueViews: true,
          totalShares: true,
          totalComments: true,
          emailSignups: true,
          ctaClicks: true,
          organicClicks: true,
        },
        _avg: { avgTimeOnPage: true, bounceRate: true },
      }),
    ]);

    const totalViews = agg._sum.totalViews ?? 0;
    const signups = agg._sum.emailSignups ?? 0;

    return {
      publishedPosts: posts,
      totalViews,
      uniqueViews: agg._sum.uniqueViews ?? 0,
      totalShares: agg._sum.totalShares ?? 0,
      totalComments: agg._sum.totalComments ?? 0,
      emailSignups: signups,
      ctaClicks: agg._sum.ctaClicks ?? 0,
      organicClicks: agg._sum.organicClicks ?? 0,
      signupRate:
        totalViews > 0 ? `${((signups / totalViews) * 100).toFixed(2)}%` : '0%',
      averageReadTimeSec: Math.round(agg._avg.avgTimeOnPage ?? 0),
      avgBounceRate:
        agg._avg.bounceRate != null ? `${agg._avg.bounceRate.toFixed(1)}%` : '0%',
    };
  }

  async topPosts(range: { from?: string; to?: string; limit?: number }) {
    const posts = await this.prisma.blogPostAnalytics.findMany({
      orderBy: { totalViews: 'desc' },
      take: range.limit ?? 20,
    });
    return posts.map((p) => ({
      postId: p.id,
      slug: p.postSlug,
      title: p.postTitle,
      category: p.category,
      publishedAt: p.publishedAt,
      views: p.totalViews,
      uniqueViews: p.uniqueViews,
      viewsLast7d: p.viewsLast7d,
      viewsLast30d: p.viewsLast30d,
      avgTimeOnPageSec: p.avgTimeOnPage,
      emailSignups: p.emailSignups,
      organicClicks: p.organicClicks,
    }));
  }
}
