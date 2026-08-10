import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConversionsService {
  constructor(private readonly prisma: PrismaService) {}

  async funnel(range: { from?: string; to?: string }) {
    const from = range.from ? new Date(range.from) : new Date(Date.now() - 30 * 864e5);
    const to = range.to ? new Date(range.to) : new Date();

    const [visits, pricingVisits, formStarts, formSubmits, demos, converted] =
      await Promise.all([
        this.prisma.marketingPageView.count({
          where: { createdAt: { gte: from, lte: to } },
        }),
        this.prisma.marketingPageView.count({
          where: {
            createdAt: { gte: from, lte: to },
            path: { contains: '/pricing' },
          },
        }),
        this.prisma.marketingEvent.count({
          where: {
            createdAt: { gte: from, lte: to },
            eventName: 'form_start',
          },
        }),
        this.prisma.contactFormSubmission.count({
          where: { createdAt: { gte: from, lte: to } },
        }),
        this.prisma.demoBooking.count({
          where: { createdAt: { gte: from, lte: to } },
        }),
        this.prisma.marketingLead.count({
          where: {
            createdAt: { gte: from, lte: to },
            status: 'CONVERTED',
          },
        }),
      ]);

    const step = (label: string, count: number, prev: number | null) => ({
      step: label,
      count,
      dropoff:
        prev !== null && prev > 0
          ? `${(((prev - count) / prev) * 100).toFixed(1)}%`
          : '—',
      conversionFromPrev:
        prev !== null && prev > 0
          ? `${((count / prev) * 100).toFixed(1)}%`
          : '—',
    });

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      funnel: [
        step('Visits', visits, null),
        step('Pricing Views', pricingVisits, visits),
        step('Form Started', formStarts, pricingVisits),
        step('Form Submitted', formSubmits, formStarts),
        step('Demos Booked', demos, formSubmits),
        step('Converted', converted, demos),
      ],
      overallConversion:
        visits > 0 ? `${((converted / visits) * 100).toFixed(3)}%` : '0%',
    };
  }

  async listGoals() {
    return this.prisma.conversionFunnel.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGoal(data: {
    name: string;
    eventName: string;
    valuePkr?: number;
  }, adminId: string) {
    return this.prisma.conversionFunnel.create({
      data: {
        name: data.name,
        slug: `goal-${Date.now()}`,
        steps: [{ name: data.name, event: data.eventName }],
        goalValue: data.valuePkr ?? 0,
      },
    });
  }
}