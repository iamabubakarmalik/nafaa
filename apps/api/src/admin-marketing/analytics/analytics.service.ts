import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(range: { from?: string; to?: string }) {
    const from = range.from
      ? new Date(range.from)
      : new Date(Date.now() - 30 * 864e5);
    const to = range.to ? new Date(range.to) : new Date();

    const [
      pageviews, uniqueVisitors, sessions, formSubmissions,
      demoBookings, newsletterSignups, chatConversations, newLeads, convertedLeads,
    ] = await Promise.all([
      this.prisma.marketingPageView.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.marketingPageView.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { visitorId: true },
        distinct: ['visitorId'],
      }).then((r) => r.length),
      this.prisma.marketingSession.count({ where: { startedAt: { gte: from, lte: to } } }),
      this.prisma.contactFormSubmission.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.demoBooking.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.newsletterSubscriber.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.chatbotConversation.count({
        where: { startedAt: { gte: from, lte: to } },
      }),
      this.prisma.marketingLead.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.marketingLead.count({
        where: {
          createdAt: { gte: from, lte: to },
          status: 'CONVERTED',
        },
      }),
    ]);

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      traffic: { pageviews, uniqueVisitors, sessions },
      conversions: {
        formSubmissions, demoBookings, newsletterSignups,
        chatConversations, newLeads, convertedLeads,
        conversionRate:
          uniqueVisitors > 0
            ? `${((convertedLeads / uniqueVisitors) * 100).toFixed(2)}%`
            : '0%',
      },
    };
  }

  async trafficSources(range: { from?: string; to?: string }) {
    const from = range.from ? new Date(range.from) : new Date(Date.now() - 30 * 864e5);
    const to = range.to ? new Date(range.to) : new Date();

    const raw = await this.prisma.marketingPageView.groupBy({
      by: ['utmSource'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      orderBy: { _count: { utmSource: 'desc' } },
      take: 20,
    });

    return raw.map((r) => ({
      source: r.utmSource ?? 'direct',
      pageviews: r._count,
    }));
  }

  async topPages(range: { from?: string; to?: string }) {
    const from = range.from ? new Date(range.from) : new Date(Date.now() - 30 * 864e5);
    const to = range.to ? new Date(range.to) : new Date();

    const raw = await this.prisma.marketingPageView.groupBy({
      by: ['path'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      orderBy: { _count: { path: 'desc' } },
      take: 25,
    });

    return raw.map((r) => ({ path: r.path, views: r._count }));
  }

  async dailyTimeseries(days: number = 30) {
    const from = new Date(Date.now() - days * 864e5);

    // Postgres date_trunc
    const rows = await this.prisma.$queryRaw<
      { day: Date; pageviews: bigint; visitors: bigint }[]
    >`
      SELECT
        date_trunc('day', "createdAt") AS day,
        COUNT(*)::bigint AS pageviews,
        COUNT(DISTINCT "visitorId")::bigint AS visitors
      FROM "MarketingPageView"
      WHERE "createdAt" >= ${from}
      GROUP BY day
      ORDER BY day ASC;
    `;

    return rows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      pageviews: Number(r.pageviews),
      visitors: Number(r.visitors),
    }));
  }
}
