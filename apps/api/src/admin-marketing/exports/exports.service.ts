import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async export(entity: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 864e5);
    const toDate = to ? new Date(to) : new Date();

    switch (entity) {
      case 'subscribers':
        return this.exportSubscribers(fromDate, toDate);
      case 'leads':
        return this.exportLeads(fromDate, toDate);
      case 'contact-forms':
        return this.exportContactForms(fromDate, toDate);
      case 'demos':
        return this.exportDemos(fromDate, toDate);
      case 'campaigns':
        return this.exportCampaigns(fromDate, toDate);
      default:
        throw new BadRequestException(`Unknown export entity: ${entity}`);
    }
  }

  private csv(header: string, rows: any[][]) {
    const escape = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    return [header, ...rows.map((r) => r.map(escape).join(','))].join('\n');
  }

  private async exportSubscribers(from: Date, to: Date) {
    const rows = await this.prisma.newsletterSubscriber.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });
    return {
      count: rows.length,
      csv: this.csv(
        'email,name,status,source,tags,subscribed_at',
        rows.map((r) => [
          r.email, ((r as any).firstName ?? '') + ' ' + ((r as any).lastName ?? ''), r.status, r.utmSource ?? '',
          (r.tags ?? []).join(';'),
          r.createdAt.toISOString(),
        ]),
      ),
    };
  }

  private async exportLeads(from: Date, to: Date) {
    const rows = await this.prisma.marketingLead.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });
    return {
      count: rows.length,
      csv: this.csv(
        'name,email,phone,company,source,status,temperature,score,created_at',
        rows.map((r) => [
          r.fullName ?? '', r.email, r.phone ?? '', r.companyName ?? '',
          r.source ?? '', r.status, r.temperature, r.score,
          r.createdAt.toISOString(),
        ]),
      ),
    };
  }

  private async exportContactForms(from: Date, to: Date) {
    const rows = await this.prisma.contactFormSubmission.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });
    return {
      count: rows.length,
      csv: this.csv(
        'ticket,name,email,phone,status,priority,created_at',
        rows.map((r) => [
          (r as any).bookingNumber ?? (r as any).ticketNumber, r.fullName, r.email, r.phone ?? '',
          r.status, r.priority, r.createdAt.toISOString(),
        ]),
      ),
    };
  }

  private async exportDemos(from: Date, to: Date) {
    const rows = await this.prisma.demoBooking.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });
    return {
      count: rows.length,
      csv: this.csv(
        'ticket,name,email,phone,business,status,scheduled_at,outcome,created_at',
        rows.map((r) => [
          (r as any).bookingNumber ?? (r as any).ticketNumber, r.fullName, r.email, r.phone ?? '',
          r.companyName ?? '', r.status,
          r.preferredDate?.toISOString() ?? '',
          (r as any).interestLevel ?? '', r.createdAt.toISOString(),
        ]),
      ),
    };
  }

  private async exportCampaigns(from: Date, to: Date) {
    const rows = await this.prisma.marketingCampaign.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      count: rows.length,
      csv: this.csv(
        'name,channel,status,recipients,opens,clicks,sent_at',
        rows.map((r) => [
          r.name, (r as any).type, r.status,
          r.totalRecipients, r.totalOpened, r.totalClicked,
          r.startedAt?.toISOString() ?? '',
        ]),
      ),
    };
  }
}
