/**
 * WhatsApp campaigns sent one by one (wa.me, no bot). The merchant picks a
 * segment and a message; the queue opens each chat with the text filled in,
 * the merchant presses send and marks it. An order from the same phone within
 * 7 days counts as converted.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { OrderToolsService } from '../order-tools.service';
import { phoneKey } from '../customer-risk';
import {
  BIRTHDAY_SEGMENT, CAMPAIGN_TEMPLATES, CONVERT_DAYS, CampaignTemplate, ConvOrder, MAX_RECIPIENTS, birthdaySoon, conversionOf, fillCampaignText,
} from './campaign-math';

const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
const DAY = 86_400_000;

export interface CreateCampaignBody {
  name?: string;
  segment?: string;
  template?: string;
  message?: string;
  code?: string;
  link?: string;
  product?: string;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tools: OrderToolsService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Orders by phone between two dates, for the 7-day conversion check. */
  private async ordersByPhone(tenantId: string, keys: string[], from: Date, to: Date) {
    const map = new Map<string, ConvOrder[]>();
    if (!keys.length) return map;
    const wanted = new Set(keys);
    const rows = await this.prisma.channelOrder.findMany({
      where: { tenantId, receivedAt: { gte: from, lte: to }, customerPhone: { not: null }, deletedAt: null },
      select: { id: true, customerPhone: true, receivedAt: true, total: true, orderStatus: true, externalOrderNumber: true, externalOrderId: true },
      take: 20_000,
    });
    for (const r of rows) {
      const k = phoneKey(r.customerPhone);
      if (!k || !wanted.has(k)) continue;
      const list = map.get(k) ?? [];
      list.push({ id: r.id, receivedAt: r.receivedAt, total: Number(r.total), status: r.orderStatus, no: orderNo(r) });
      map.set(k, list);
    }
    return map;
  }

  private async withConversions<T extends { phoneKey: string; sentAt: Date | null; status: string }>(tenantId: string, recipients: T[]) {
    const sent = recipients.filter((r) => r.sentAt && r.status === 'SENT');
    if (!sent.length) return recipients.map((r) => ({ ...r, converted: null as ConvOrder | null }));
    const times = sent.map((r) => r.sentAt!.getTime());
    const orders = await this.ordersByPhone(tenantId, [...new Set(sent.map((r) => r.phoneKey))], new Date(Math.min(...times)), new Date(Math.max(...times) + CONVERT_DAYS * DAY));
    return recipients.map((r) => ({ ...r, converted: r.status === 'SENT' ? conversionOf(r.sentAt, orders.get(r.phoneKey) ?? []) : null }));
  }

  async list(user: AuthenticatedUser) {
    const campaigns = await this.prisma.onlineCampaign.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { recipients: { select: { phoneKey: true, sentAt: true, status: true, replied: true } } },
    });
    const all = campaigns.flatMap((c) => c.recipients);
    const conv = await this.withConversions(user.tenantId, all);
    let i = 0;
    const rows = campaigns.map((c) => {
      const mine = conv.slice(i, i + c.recipients.length);
      i += c.recipients.length;
      const converted = mine.filter((r) => r.converted);
      const { recipients, ...rest } = c;
      return {
        ...rest,
        stats: {
          recipients: recipients.length,
          sent: recipients.filter((r) => r.status === 'SENT').length,
          skipped: recipients.filter((r) => r.status === 'SKIPPED').length,
          pending: recipients.filter((r) => r.status === 'PENDING').length,
          replied: recipients.filter((r) => r.replied).length,
          converted: converted.length,
          revenue: Math.round(converted.reduce((s, r) => s + (r.converted?.total ?? 0), 0)),
        },
      };
    });
    const sum = (k: keyof (typeof rows)[number]['stats']) => rows.reduce((s, r) => s + r.stats[k], 0);
    const sent = sum('sent');
    return {
      campaigns: rows,
      totals: { campaigns: rows.length, sent, pending: sum('pending'), converted: sum('converted'), revenue: sum('revenue'), rate: sent ? Math.round((sum('converted') / sent) * 1000) / 10 : 0 },
    };
  }

  /** Customers whose birthday (from the customer record) falls in the next 7 days and who have a phone. */
  private async birthdayPeople(tenantId: string) {
    const tz = await this.tz.resolve(tenantId);
    const [y, m, d] = businessDayKey(new Date(), tz).split('-').map(Number);
    const today = new Date(Date.UTC(y, m - 1, d));
    const rows = await this.prisma.customer.findMany({
      where: { tenantId, isActive: true, dateOfBirth: { not: null }, phone: { not: null } },
      select: { name: true, phone: true, dateOfBirth: true },
      take: 20_000,
    });
    return rows.filter((c) => birthdaySoon(c.dateOfBirth!, today)).map((c) => ({ name: c.name, phone: String(c.phone) }));
  }

  async create(user: AuthenticatedUser, scope: ShopScope, body: CreateCampaignBody) {
    const template = (CAMPAIGN_TEMPLATES as readonly string[]).includes(String(body.template)) ? (body.template as CampaignTemplate) : 'CUSTOM';
    const segment = String(body.segment ?? '').trim().slice(0, 30) || 'all';
    const message = String(body.message ?? '').trim().slice(0, 1000);
    if (!message) throw new BadRequestException('Message likhein');
    const code = String(body.code ?? '').trim().slice(0, 40) || null;
    const link = String(body.link ?? '').trim().slice(0, 500) || null;
    if (link && !/^https?:\/\/\S+$/i.test(link)) throw new BadRequestException('Link https:// se shuru hona chahiye');
    const product = String(body.product ?? '').trim().slice(0, 120) || null;

    let people: Array<{ name: string; phone: string }>;
    if (segment === BIRTHDAY_SEGMENT) {
      people = await this.birthdayPeople(user.tenantId);
    } else {
      const res = await this.tools.customers(user, scope, { segment, limit: MAX_RECIPIENTS, offset: 0 });
      if (segment !== 'all' && !(segment in res.counts)) throw new BadRequestException('Ye customer list maujood nahi');
      people = res.rows.filter((c) => !c.blocked).map((c) => ({ name: c.name, phone: c.phone }));
    }
    const blocked = new Set((await this.tools.blocklist(user.tenantId)).map((b) => b.key));
    const seen = new Set<string>();
    const shop = (await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } }))?.name ?? '';
    const recipients = people
      .map((p) => ({ ...p, key: phoneKey(p.phone) }))
      .filter((p): p is typeof p & { key: string } => !!p.key && !blocked.has(p.key) && !seen.has(p.key) && !!seen.add(p.key))
      .slice(0, MAX_RECIPIENTS);
    if (!recipients.length) throw new BadRequestException('Is list me bhejne ke liye koi customer nahi');

    const name = String(body.name ?? '').trim().slice(0, 80) || `${template} · ${segment}`;
    const campaign = await this.prisma.onlineCampaign.create({
      data: {
        tenantId: user.tenantId, name, segment, template, message, code, link, createdById: user.id,
        recipients: {
          create: recipients.map((p, i) => ({
            tenantId: user.tenantId, phoneKey: p.key, phone: p.phone, name: p.name || '', position: i,
            text: fillCampaignText(message, { name: p.name, shop, code, link, product }),
          })),
        },
      },
      select: { id: true },
    });
    return this.get(user, campaign.id);
  }

  async get(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.onlineCampaign.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { recipients: { orderBy: { position: 'asc' } } },
    });
    if (!c) throw new NotFoundException('Campaign nahi mila');
    const recipients = await this.withConversions(user.tenantId, c.recipients);
    const converted = recipients.filter((r) => r.converted);
    const { recipients: _r, ...rest } = c;
    return {
      ...rest,
      recipients: recipients.map((r) => ({
        id: r.id, name: r.name, phone: r.phone, text: r.text, status: r.status, sentAt: r.sentAt, replied: r.replied,
        converted: r.converted ? { orderId: r.converted.id, no: r.converted.no, total: r.converted.total, at: r.converted.receivedAt } : null,
      })),
      stats: {
        recipients: recipients.length,
        sent: recipients.filter((r) => r.status === 'SENT').length,
        skipped: recipients.filter((r) => r.status === 'SKIPPED').length,
        pending: recipients.filter((r) => r.status === 'PENDING').length,
        replied: recipients.filter((r) => r.replied).length,
        converted: converted.length,
        revenue: Math.round(converted.reduce((s, r) => s + (r.converted?.total ?? 0), 0)),
      },
    };
  }

  /** Marks one chat sent, skipped or back to pending, and whether the customer replied. */
  async mark(user: AuthenticatedUser, id: string, recipientId: string, body: { status?: string; replied?: boolean }) {
    const r = await this.prisma.onlineCampaignRecipient.findFirst({ where: { id: recipientId, campaignId: id, tenantId: user.tenantId }, select: { id: true, sentAt: true } });
    if (!r) throw new NotFoundException('Customer is campaign me nahi');
    const data: Record<string, unknown> = {};
    if (body.status === 'SENT') Object.assign(data, { status: 'SENT', sentAt: r.sentAt ?? new Date(), sentById: user.id });
    else if (body.status === 'SKIPPED') Object.assign(data, { status: 'SKIPPED' });
    else if (body.status === 'PENDING') Object.assign(data, { status: 'PENDING', sentAt: null, sentById: null });
    if (typeof body.replied === 'boolean') data.replied = body.replied;
    if (!Object.keys(data).length) throw new BadRequestException('Kya badalna hai?');
    await this.prisma.onlineCampaignRecipient.update({ where: { id: r.id }, data });
    const left = await this.prisma.onlineCampaignRecipient.count({ where: { campaignId: id, status: 'PENDING' } });
    await this.prisma.onlineCampaign.update({ where: { id }, data: { status: left ? 'OPEN' : 'DONE' } });
    return { ok: true, pending: left };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const done = await this.prisma.onlineCampaign.deleteMany({ where: { id, tenantId: user.tenantId } });
    if (!done.count) throw new NotFoundException('Campaign nahi mila');
    return { ok: true };
  }
}
