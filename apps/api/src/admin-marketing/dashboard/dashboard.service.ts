import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketingDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const today = new Date();
    const day7 = new Date(Date.now() - 7 * 864e5);
    const day30 = new Date(Date.now() - 30 * 864e5);

    const [
      // Newsletter
      subsTotal, subsActive, subs7d,
      // Contact forms
      formsNew, formsTotal7d, formsUrgent,
      // Demos
      demosUpcoming, demosCompleted30d, demosConverted30d,
      // Leads
      leadsTotal, leadsFire, leadsHot, leadsNew7d,
      // Chatbot
      chatWaiting, chatActive, chat7d,
      // Campaigns
      campaignsActive, campaignsSent30d,
      // Traffic
      pageviews7d, uniqueVisitors7d,
    ] = await Promise.all([
      this.prisma.newsletterSubscriber.count(),
      this.prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
      this.prisma.newsletterSubscriber.count({
        where: { createdAt: { gte: day7 } },
      }),

      this.prisma.contactFormSubmission.count({ where: { status: 'NEW' } }),
      this.prisma.contactFormSubmission.count({
        where: { createdAt: { gte: day7 } },
      }),
      this.prisma.contactFormSubmission.count({
        where: { priority: 'URGENT', status: { not: 'RESOLVED' } },
      }),

      this.prisma.demoBooking.count({
        where: {
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
          preferredDate: { gte: today },
        },
      }),
      this.prisma.demoBooking.count({
        where: { status: 'COMPLETED', completedAt: { gte: day30 } },
      }),
      this.prisma.demoBooking.count({
        where: { interestLevel: 'READY_TO_BUY', completedAt: { gte: day30 } },
      }),

      this.prisma.marketingLead.count(),
      this.prisma.marketingLead.count({ where: { temperature: 'FIRE' } }),
      this.prisma.marketingLead.count({ where: { temperature: 'HOT' } }),
      this.prisma.marketingLead.count({ where: { createdAt: { gte: day7 } } }),

      this.prisma.chatbotConversation.count({ where: { status: 'WAITING_HUMAN' } }),
      this.prisma.chatbotConversation.count({ where: { status: 'ACTIVE' } }),
      this.prisma.chatbotConversation.count({
        where: { startedAt: { gte: day7 } },
      }),

      this.prisma.marketingCampaign.count({
        where: { status: { in: ['RUNNING', 'SCHEDULED'] } },
      }),
      this.prisma.marketingCampaign.count({
        where: { status: 'COMPLETED', startedAt: { gte: day30 } },
      }),

      this.prisma.marketingPageView.count({ where: { createdAt: { gte: day7 } } }),
      this.prisma.marketingPageView
        .findMany({
          where: { createdAt: { gte: day7 } },
          select: { visitorId: true },
          distinct: ['visitorId'],
        })
        .then((r: any) => r.length),
    ]);

    return {
      newsletter: {
        total: subsTotal,
        active: subsActive,
        new7d: subs7d,
      },
      contactForms: {
        new: formsNew,
        last7d: formsTotal7d,
        urgentOpen: formsUrgent,
      },
      demos: {
        upcoming: demosUpcoming,
        completed30d: demosCompleted30d,
        converted30d: demosConverted30d,
        conversionRate:
          demosCompleted30d > 0
            ? `${((demosConverted30d / demosCompleted30d) * 100).toFixed(1)}%`
            : '0%',
      },
      leads: {
        total: leadsTotal,
        fire: leadsFire,
        hot: leadsHot,
        new7d: leadsNew7d,
      },
      chatbot: {
        waiting: chatWaiting,
        active: chatActive,
        last7d: chat7d,
      },
      campaigns: {
        active: campaignsActive,
        sent30d: campaignsSent30d,
      },
      traffic: {
        pageviews7d,
        uniqueVisitors7d,
      },
      alerts: [
        ...(formsUrgent > 0
          ? [{ type: 'urgent', message: `${formsUrgent} urgent contact forms open` }]
          : []),
        ...(chatWaiting > 0
          ? [{ type: 'warning', message: `${chatWaiting} visitors waiting in chat` }]
          : []),
        ...(leadsFire > 0
          ? [{ type: 'info', message: `${leadsFire} FIRE-temperature leads need attention` }]
          : []),
      ],
    };
  }

  async recentActivity(limit = 20) {
    return this.prisma.activityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        // user include removed,
      },
    });
  }
}
