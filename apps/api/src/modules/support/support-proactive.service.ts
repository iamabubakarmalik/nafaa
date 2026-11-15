/**
 * Proactive support messages: a welcome from a named team member, then
 * lifecycle check-ins (no products on day 1, first sale, 3 days inactive on
 * trial, trial ending, trial ended). They arrive as normal team messages in
 * the shop's support chat, in the merchant's language.
 *
 * Rules live in proactiveDue() (support.logic.ts). Each message goes once per
 * shop: a row in live_support_proactive (unique per shop and key) is written
 * before the message, so two servers or two runs cannot both send it. The job
 * runs every 10 minutes and can be paused from System → Jobs like any other.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '../../core/system-control/cron.decorator';
import { SupportService } from './support.service';
import { SupportSettingsService } from './support-settings.service';
import { firstName, inPktWindow, proactiveDue, type ProactiveFacts } from './support.logic';
import { pickLang, tr } from './support.copy';
import { fillTemplate } from './support.proactive-copy';
import { SUPPORT_PROACTIVE_KEYS, type SupportLang, type SupportProactiveKey, type SupportProactiveStats } from './support.types';

const OPT_OUT = 'opt_out';
const DAY = 86_400_000;
const PAID_STATUSES = ['ACTIVE', 'PAST_DUE'];

@Injectable()
export class SupportProactiveService {
  private readonly logger = new Logger(SupportProactiveService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly support: SupportService,
    private readonly settings: SupportSettingsService,
    private readonly config: ConfigService,
  ) {}

  /* ───────────────────────── the job ───────────────────────── */

  @Cron('0 */10 * * * *')
  async runScheduled() {
    await this.run();
  }

  /** Checks every shop and sends what is due. Returns how many messages went out. */
  async run(now = new Date()): Promise<{ sent: number; checked: number }> {
    if (this.running) return { sent: 0, checked: 0 };
    this.running = true;
    try {
      const s = (await this.settings.get()).proactive;
      if (!s.enabled || inPktWindow(s.quietHours, now)) return { sent: 0, checked: 0 };
      const tenants = await this.prisma.tenant.findMany({
        where: {
          slug: { not: 'nafaa-system' },
          status: { not: 'SUSPENDED' },
          OR: [{ pausedAt: null }, { pausedUntil: { lt: now } }],
          // Older shops can only be due for trial-ended (14 days) or later messages; keep the scan small.
          createdAt: { gte: new Date(now.getTime() - 120 * DAY) },
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      });
      let sent = 0;
      for (let i = 0; i < tenants.length; i += 200) {
        const ids = tenants.slice(i, i + 200).map((t) => t.id);
        const facts = await this.facts(ids, now);
        for (const [tenantId, f] of facts) {
          const key = proactiveDue(f, s, now);
          if (key && (await this.send(tenantId, key, now))) sent++;
        }
      }
      if (sent) this.logger.log(`Proactive support: ${sent} message(s) sent`);
      return { sent, checked: tenants.length };
    } finally {
      this.running = false;
    }
  }

  /** First dashboard visit (the chat widget asks for its status): send the welcome now. */
  async welcomeOnVisit(tenantId: string, now = new Date()) {
    const s = (await this.settings.get()).proactive;
    if (!s.enabled || !s.messages.welcome.enabled || inPktWindow(s.quietHours, now)) return;
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { createdAt: true, status: true, pausedAt: true, pausedUntil: true, slug: true } });
    if (!t || t.slug === 'nafaa-system' || t.status === 'SUSPENDED') return;
    if (t.pausedAt && (!t.pausedUntil || t.pausedUntil > now)) return;
    if (now.getTime() - t.createdAt.getTime() > s.welcomeMaxAgeDays * DAY) return;
    const done = await this.prisma.liveSupportProactive.findUnique({ where: { tenantId_key: { tenantId, key: 'welcome' } }, select: { id: true } });
    if (!done) await this.send(tenantId, 'welcome', now);
  }

  /* ───────────────────────── facts per shop ───────────────────────── */

  private async facts(ids: string[], now: Date): Promise<Map<string, ProactiveFacts>> {
    const [tenants, products, firstSales, subs, markers, wrote] = await Promise.all([
      this.prisma.tenant.findMany({ where: { id: { in: ids } }, select: { id: true, createdAt: true, status: true, pausedAt: true, pausedUntil: true, lastActiveAt: true } }),
      this.prisma.product.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, isActive: true }, _count: { _all: true } }),
      this.prisma.sale.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids } }, _min: { createdAt: true } }),
      this.prisma.subscription.findMany({
        where: { tenantId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        select: { tenantId: true, status: true, trialEndsAt: true, currentPeriodEnd: true, amount: true, plan: { select: { slug: true } } },
      }),
      this.prisma.liveSupportProactive.findMany({ where: { tenantId: { in: ids } }, select: { tenantId: true, key: true, sentAt: true } }),
      this.prisma.$queryRaw<Array<{ tenantId: string; at: Date }>>`
        SELECT c."tenantId", MAX(m."createdAt") AS at
        FROM "live_support_messages" m JOIN "live_support_conversations" c ON c."id" = m."conversationId"
        WHERE m."sender" = 'MERCHANT' AND c."tenantId" IN (${Prisma.join(ids)})
        GROUP BY c."tenantId"`,
    ]);
    const out = new Map<string, ProactiveFacts>();
    for (const t of tenants) {
      const tSubs = subs.filter((x) => x.tenantId === t.id);
      const paid = tSubs.some((x) => PAID_STATUSES.includes(x.status) && x.plan?.slug !== 'free-trial' && x.amount > 0);
      const trial = tSubs.find((x) => x.status === 'TRIAL');
      const trialEnd = trial?.trialEndsAt ?? (trial ? trial.currentPeriodEnd : null);
      const mine = markers.filter((m) => m.tenantId === t.id);
      const sent = new Set(mine.map((m) => m.key));
      const proactiveRows = mine.filter((m) => m.key !== OPT_OUT);
      out.set(t.id, {
        createdAt: t.createdAt,
        tenantStatus: String(t.status),
        paused: !!t.pausedAt && (!t.pausedUntil || t.pausedUntil > now),
        lastActiveAt: t.lastActiveAt,
        products: products.find((p) => p.tenantId === t.id)?._count._all ?? 0,
        firstSaleAt: firstSales.find((x) => x.tenantId === t.id)?._min.createdAt ?? null,
        trialEndsAt: !paid && trialEnd && trialEnd > now ? trialEnd : null,
        trialEndedAt: !paid && trialEnd && trialEnd <= now ? trialEnd : null,
        paid,
        sent,
        lastProactiveAt: proactiveRows.reduce<Date | null>((a, m) => (!a || m.sentAt > a ? m.sentAt : a), null),
        optOut: sent.has(OPT_OUT),
        merchantWroteAt: wrote.find((w) => w.tenantId === t.id)?.at ?? null,
      });
    }
    return out;
  }

  /* ───────────────────────── composing and sending ───────────────────────── */

  /** The team member the messages come from: the configured one, else the first super admin. */
  private async agent() {
    const s = (await this.settings.get()).proactive;
    const user = s.agentUserId
      ? await this.prisma.user.findFirst({ where: { id: s.agentUserId, role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN_STAFF] }, isActive: true }, select: { id: true, fullName: true } })
      : null;
    const fallback = user ?? await this.prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, fullName: true } });
    return { id: fallback?.id ?? null, name: s.agentName || firstName(fallback?.fullName) };
  }

  private async vars(tenantId: string, lang: SupportLang, agentName: string) {
    const [t, owner, products, bills, customers, trial] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, language: true } }),
      this.prisma.user.findFirst({ where: { tenantId, role: UserRole.OWNER, isActive: true }, select: { id: true, fullName: true, language: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.sale.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.subscription.findFirst({ where: { tenantId, status: 'TRIAL' }, orderBy: { createdAt: 'desc' }, select: { trialEndsAt: true, currentPeriodEnd: true } }),
    ]);
    const end = trial?.trialEndsAt ?? trial?.currentPeriodEnd ?? null;
    const locale = lang === 'ur' ? 'ur-PK' : 'en-PK';
    const base = (this.config.get<string>('WEB_APP_URL') || this.config.get<string>('APP_URL') || 'https://app.nafaa.pk').replace(/\/+$/, '');
    return {
      owner: firstName(owner?.fullName) === 'Nafaa team' ? (t?.name ?? '') : firstName(owner?.fullName),
      agent: agentName,
      shop: t?.name ?? '',
      products,
      bills,
      customers,
      trialEnd: end ? end.toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'Asia/Karachi' }) : '',
      days: end ? Math.max(1, Math.ceil((end.getTime() - Date.now()) / DAY)) : '',
      planLink: `${base}/billing`,
    };
  }

  /** Text and chips of one message for a shop (or sample values for a preview). */
  async compose(key: SupportProactiveKey, lang: SupportLang, tenantId?: string) {
    const s = (await this.settings.get()).proactive;
    const m = s.messages[key];
    const agent = await this.agent();
    const vars = tenantId
      ? await this.vars(tenantId, lang, agent.name)
      : { owner: 'Ali', agent: agent.name, shop: 'Ali General Store', products: 24, bills: 57, customers: 9, trialEnd: '20 November', days: 2, planLink: 'https://app.nafaa.pk/billing' };
    return { text: fillTemplate(tr(m.template, lang), vars), chips: m.chips.map((c) => tr(c, lang)).filter(Boolean), agent };
  }

  /** Sends one message once. Returns false when it was already sent (or nobody can send it). */
  private async send(tenantId: string, key: SupportProactiveKey, now: Date): Promise<boolean> {
    let marker: { id: string };
    try {
      marker = await this.prisma.liveSupportProactive.create({ data: { tenantId, key, sentAt: now }, select: { id: true } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
    try {
      const [t, owner] = await Promise.all([
        this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { language: true } }),
        this.prisma.user.findFirst({ where: { tenantId, role: UserRole.OWNER, isActive: true }, select: { language: true } }),
      ]);
      const lang = pickLang(owner?.language, t?.language);
      const { text, chips, agent } = await this.compose(key, lang, tenantId);
      if (!agent.id || !text) {
        await this.prisma.liveSupportProactive.delete({ where: { id: marker.id } });
        return false;
      }
      const msg = await this.support.postProactive(tenantId, { key, text, chips, agentUserId: agent.id, agentName: agent.name });
      await this.prisma.liveSupportProactive.update({ where: { id: marker.id }, data: { conversationId: msg.conversationId, messageId: msg.id, lang } });
      return true;
    } catch (e) {
      // Nothing reached the shop: free the marker so the next run can try again.
      await this.prisma.liveSupportProactive.delete({ where: { id: marker.id } }).catch(() => undefined);
      this.logger.warn(`Proactive "${key}" for ${tenantId} failed: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  /* ───────────────────────── shop opt-out, replies, stats ───────────────────────── */

  async isOptedOut(tenantId: string) {
    return !!(await this.prisma.liveSupportProactive.findUnique({ where: { tenantId_key: { tenantId, key: OPT_OUT } }, select: { id: true } }));
  }

  async setOptOut(tenantId: string, off: boolean) {
    if (off) {
      await this.prisma.liveSupportProactive.upsert({ where: { tenantId_key: { tenantId, key: OPT_OUT } }, create: { tenantId, key: OPT_OUT }, update: {} });
    } else {
      await this.prisma.liveSupportProactive.deleteMany({ where: { tenantId, key: OPT_OUT } });
    }
    return { off };
  }

  async stats(): Promise<SupportProactiveStats[]> {
    const rows = await this.prisma.liveSupportProactive.findMany({
      where: { key: { in: [...SUPPORT_PROACTIVE_KEYS] }, messageId: { not: null } },
      select: { tenantId: true, key: true, sentAt: true, repliedAt: true },
    });
    const tenantIds = [...new Set(rows.map((r) => r.tenantId))];
    const paidSubs = tenantIds.length
      ? await this.prisma.subscription.findMany({
          where: { tenantId: { in: tenantIds }, status: { in: ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] }, amount: { gt: 0 }, plan: { slug: { not: 'free-trial' } } },
          select: { tenantId: true, currentPeriodStart: true },
        })
      : [];
    return SUPPORT_PROACTIVE_KEYS.map((key) => {
      const list = rows.filter((r) => r.key === key);
      const converted = list.filter((r) => paidSubs.some((p) => p.tenantId === r.tenantId && p.currentPeriodStart >= r.sentAt && p.currentPeriodStart.getTime() <= r.sentAt.getTime() + 14 * DAY)).length;
      const last = list.reduce<Date | null>((a, r) => (!a || r.sentAt > a ? r.sentAt : a), null);
      return { key, sent: list.length, replied: list.filter((r) => r.repliedAt).length, converted, lastSentAt: last ? last.toISOString() : null };
    });
  }
}
