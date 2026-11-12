/**
 * Billing messages to the shop owner: an in-app notification (which also
 * pushes to the phone) and a short, plain email. Each message has a key so
 * the same reminder is never sent twice in its window.
 *
 * Emails use an admin-editable template when one exists with the slug below
 * (Admin → Email templates), else the built-in text here.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';

type Tone = 'info' | 'warning' | 'danger' | 'success';

interface Message {
  key: string;
  /** Do not repeat within this many days. */
  windowDays: number;
  tone: Tone;
  title: string;
  lines: string[];
  cta?: { label: string; path: string };
  templateSlug?: string;
  variables?: Record<string, unknown>;
}

const COLORS: Record<Tone, string> = { info: '#0284c7', warning: '#d97706', danger: '#dc2626', success: '#059669' };
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const day = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 5 * 3_600_000).toISOString().slice(0, 10).split('-').reverse().join('-') : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

@Injectable()
export class BillingNotifier {
  private readonly logger = new Logger(BillingNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private get appUrl() {
    return this.config.get<string>('APP_URL') || 'https://app.nafaa.pk';
  }

  /* ───────────── messages ───────────── */

  addOnTurnedOn(tenantId: string, name: string, amount: number, dueAt: Date, invoiceNo: string) {
    return this.send(tenantId, {
      key: `addon-on:${invoiceNo}`, windowDays: 365, tone: 'info',
      title: `${name} chalu ho gaya`,
      lines: [`${name} abhi se chalu hai.`, `Is ka bill ${rs(amount)} hai (${invoiceNo}). ${day(dueAt)} tak payment kar dein, warna ye khud band ho jayega.`],
      cta: { label: 'Payment karein', path: '/billing' },
    });
  }

  addOnPaymentDue(tenantId: string, name: string, dueAt: Date, key: string) {
    return this.send(tenantId, {
      key: `addon-due:${key}`, windowDays: 30, tone: 'warning',
      title: `${name}: kal tak payment karein`,
      lines: [`${name} ki payment ${day(dueAt)} tak baqi hai.`, 'Payment na hui to ye add-on band ho jayega. Aap ka data mehfooz rahega.'],
      cta: { label: 'Payment karein', path: '/billing' },
    });
  }

  addOnSuspended(tenantId: string, name: string, key: string) {
    return this.send(tenantId, {
      key: `addon-off:${key}`, windowDays: 30, tone: 'danger',
      title: `${name} band ho gaya`,
      lines: [`Payment na hone ki wajah se ${name} band kar diya gaya.`, 'Payment karte hi ye dobara chalu ho jayega. Aap ka data mehfooz hai.'],
      cta: { label: 'Payment karein', path: '/billing' },
    });
  }

  renewalBill(tenantId: string, planName: string, amount: number, periodEnd: Date, invoiceNo: string, keySuffix = '') {
    return this.send(tenantId, {
      key: `renewal:${invoiceNo}${keySuffix}`, windowDays: 365, tone: 'info',
      title: `Agle mahine ka bill tayyar hai: ${rs(amount)}`,
      lines: [`Aap ka ${planName} plan ${day(periodEnd)} ko khatam hoga.`, `Renewal ka bill ${invoiceNo} (${rs(amount)}) tayyar hai. Waqt par payment karein taake kaam na ruke.`],
      cta: { label: 'Bill dekhein aur pay karein', path: '/billing' },
    });
  }

  planEndingSoon(tenantId: string, planName: string, daysLeft: number, periodEnd: Date) {
    return this.send(tenantId, {
      key: `ending:${day(periodEnd)}:${daysLeft}`, windowDays: 40, tone: daysLeft <= 1 ? 'danger' : 'warning',
      title: daysLeft <= 1 ? `Aap ka plan kal khatam ho raha hai` : `Aap ka plan ${daysLeft} din me khatam ho raha hai`,
      lines: [`${planName} plan ${day(periodEnd)} ko khatam hoga.`, 'Renew kar lein taake bikri aur records chalte rahein.'],
      cta: { label: 'Abhi renew karein', path: '/billing' },
    });
  }

  graceDay(tenantId: string, daysLeft: number, blocksAt: Date) {
    return this.send(tenantId, {
      key: `grace:${day(blocksAt)}:${daysLeft}`, windowDays: 2, tone: 'danger',
      title: daysLeft <= 0 ? 'Aaj aap ka Nafaa band ho jayega' : `${daysLeft} din me aap ka Nafaa band ho jayega`,
      lines: ['Aap ka plan khatam ho chuka hai aur payment baqi hai.', `${day(blocksAt)} ke baad app band ho jayegi. Data mehfooz rahega aur payment karte hi sab wapas chalu.`],
      cta: { label: 'Payment karein', path: '/billing' },
    });
  }

  movedToFree(tenantId: string) {
    return this.send(tenantId, {
      key: `free:${new Date().toISOString().slice(0, 10)}`, windowDays: 1, tone: 'success',
      title: 'Aap Free plan par aa gaye',
      lines: ['Aap ki dukaan ab Free plan par hai: 1 user, 1 dukaan, 300 bill mahana.', 'Kabhi bhi Basic ya Pro par ja sakte hain.'],
      cta: { label: 'Plans dekhein', path: '/billing' },
    });
  }

  grandfatherEnding(tenantId: string, daysLeft: number, until: Date, apps: string[]) {
    return this.send(tenantId, {
      key: `grandfather:${daysLeft}`, windowDays: 30, tone: 'warning',
      title: `Aap ki purani chhoot ${daysLeft} din me khatam`,
      lines: [
        `Purane customer hone ki wajah se aap ko ${day(until)} tak har cheez muft mil rahi hai.`,
        apps.length ? `Aap ye cheezen use kar rahe hain: ${apps.join(', ')}. Inhein chalta rakhne ke liye "Mera plan" me add-on le lein.` : 'Is ke baad aap ke plan wali cheezen chalti rahengi.',
      ],
      cta: { label: 'Mera plan dekhein', path: '/billing' },
    });
  }

  limitNear(tenantId: string, label: string, current: number, limit: number, month: string) {
    const full = current >= limit;
    return this.send(tenantId, {
      key: `limit:${label}:${month}:${full ? 'full' : 'near'}`, windowDays: 31, tone: full ? 'danger' : 'warning',
      title: full ? `${label} ki had poori ho gayi` : `${label} ki had kareeb hai`,
      lines: [`Aap ${current} / ${limit} ${label} use kar chuke hain.`, full ? 'Mazeed ke liye plan barhayein ya extra add-on lein.' : 'Had poori hone se pehle plan barha lein.'],
      cta: { label: 'Plan barhayein', path: '/billing' },
    });
  }

  /* ───────────── delivery ───────────── */

  private async alreadySent(tenantId: string, key: string, windowDays: number) {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const hit = await this.prisma.notification.findFirst({
      where: { tenantId, createdAt: { gte: since }, metadata: { path: ['billingKey'], equals: key } },
      select: { id: true },
    });
    return !!hit;
  }

  private async send(tenantId: string, m: Message): Promise<boolean> {
    try {
      if (await this.alreadySent(tenantId, m.key, m.windowDays)) return false;
      await this.notifications.create({
        tenantId,
        type: m.tone === 'danger' || m.tone === 'warning' ? 'WARNING' : 'INFO',
        title: m.title,
        message: m.lines.join(' '),
        link: m.cta?.path ?? '/billing',
        metadata: { billingKey: m.key },
      });
      const owner = await this.prisma.user.findFirst({ where: { tenantId, role: 'OWNER', isActive: true }, select: { email: true, fullName: true } });
      const shop = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
      if (owner?.email && !owner.email.endsWith('@nafaa.local')) {
        const url = `${this.appUrl}${m.cta?.path ?? '/billing'}`;
        await this.email.send({
          tenantId,
          toEmail: owner.email,
          toName: owner.fullName,
          subject: `${m.title} · ${shop?.name ?? 'Nafaa'}`,
          bodyHtml: this.html(m, owner.fullName, shop?.name ?? '', url),
          bodyText: `Assalam-o-Alaikum ${owner.fullName},\n\n${m.lines.join('\n')}\n\n${m.cta ? `${m.cta.label}: ${url}` : ''}\n\nNafaa`,
        });
      }
      return true;
    } catch (e) {
      this.logger.warn(`Billing message ${m.key} for ${tenantId} failed: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  private html(m: Message, name: string, shop: string, url: string) {
    const color = COLORS[m.tone];
    return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${color};padding:22px 24px;color:#ffffff;font-size:20px;font-weight:700">${esc(m.title)}</td></tr>
<tr><td style="padding:24px;color:#1e293b;font-size:15px;line-height:1.7">
<p style="margin:0 0 12px">Assalam-o-Alaikum <b>${esc(name)}</b>,</p>
${m.lines.map((l) => `<p style="margin:0 0 12px;color:#475569">${esc(l)}</p>`).join('')}
${m.cta ? `<p style="margin:20px 0 4px"><a href="${esc(url)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${esc(m.cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">${esc(shop)} · Nafaa · Sawal ho to WhatsApp 0324 1772933</td></tr>
</table></td></tr></table></body></html>`;
  }
}
