import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger('SubscriptionCron');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Runs every day at 12:00 AM (server time).
   * - Mark expired trials → EXPIRED
   * - Mark expired ACTIVE subs → PAST_DUE
   * - Mark long-overdue PAST_DUE → EXPIRED (after 3-day grace)
   * - Send expiry warning emails (3 days, 1 day before)
   * - Send expired notification
   */
  @Cron('0 0 * * *', { name: 'subscription-daily-check', timeZone: 'Asia/Karachi' })
  async dailyExpiryCheck() {
    this.logger.log('🕛 Running daily subscription expiry check...');

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 24 * 1000);
    const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      const stats = {
        trialsExpired: 0,
        subsPastDue: 0,
        subsExpired: 0,
        warningsSent: 0,
        errors: 0,
      };

      // 1. Mark expired trials → EXPIRED
      const expiredTrials = await this.prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: { lt: now },
        },
        include: { tenant: true, plan: true },
      });

      for (const sub of expiredTrials) {
        try {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
          });
          await this.sendTrialExpiredEmail(sub);
          stats.trialsExpired++;
        } catch (e) {
          stats.errors++;
          this.logger.error(`Failed to expire trial ${sub.id}:`, e);
        }
      }

      // 2. Mark expired ACTIVE → PAST_DUE
      const overdueActive = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lt: now },
        },
        include: { tenant: true, plan: true },
      });

      for (const sub of overdueActive) {
        try {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'PAST_DUE' },
          });
          await this.sendPastDueEmail(sub);
          stats.subsPastDue++;
        } catch (e) {
          stats.errors++;
        }
      }

      // 3. Mark long-overdue PAST_DUE → EXPIRED (3+ days)
      const graceLimit = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const longOverdue = await this.prisma.subscription.findMany({
        where: {
          status: 'PAST_DUE',
          currentPeriodEnd: { lt: graceLimit },
        },
        include: { tenant: true, plan: true },
      });

      for (const sub of longOverdue) {
        try {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
          });
          await this.sendFullExpiredEmail(sub);
          stats.subsExpired++;
        } catch (e) {
          stats.errors++;
        }
      }

      // 4. Send warning emails (3 days before)
      const trial3Day = await this.prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: {
            gte: new Date(in3Days.getTime() - 12 * 60 * 60 * 1000),
            lte: new Date(in3Days.getTime() + 12 * 60 * 60 * 1000),
          },
        },
        include: { tenant: true, plan: true },
      });

      for (const sub of trial3Day) {
        try {
          await this.sendTrialEndingSoonEmail(sub, 3);
          stats.warningsSent++;
        } catch (e) {
          stats.errors++;
        }
      }

      // 5. Send warning emails (1 day before)
      const trial1Day = await this.prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: {
            gte: new Date(in1Day.getTime() - 12 * 60 * 60 * 1000),
            lte: new Date(in1Day.getTime() + 12 * 60 * 60 * 1000),
          },
        },
        include: { tenant: true, plan: true },
      });

      for (const sub of trial1Day) {
        try {
          await this.sendTrialEndingSoonEmail(sub, 1);
          stats.warningsSent++;
        } catch (e) {
          stats.errors++;
        }
      }

      this.logger.log(
        `✅ Daily check complete: ${JSON.stringify(stats)}`,
      );
    } catch (e) {
      this.logger.error('Daily expiry check failed:', e);
    }
  }

  /**
   * Manual trigger (for testing or admin button)
   */
  async runNow() {
    await this.dailyExpiryCheck();
    return { success: true, message: 'Expiry check completed' };
  }

  // ===== Email Helpers =====

  private async sendTrialEndingSoonEmail(sub: any, daysLeft: number) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    const upgradeUrl = `${process.env.APP_URL || 'https://app.nafaa.pk'}/plan`;

    await this.email.send({
      tenantId: sub.tenantId,
      toEmail: owner.email,
      toName: owner.fullName,
      subject: `⏰ Aap ka Nafaa trial ${daysLeft} ${daysLeft === 1 ? 'din' : 'din'} mein khatam ho raha hai`,
      bodyHtml: this.trialWarningTemplate({
        name: owner.fullName,
        shopName: sub.tenant.name,
        daysLeft,
        upgradeUrl,
      }),
      bodyText: `Assalam-o-Alaikum ${owner.fullName}, aap ka Nafaa free trial ${daysLeft} din mein expire ho jaayega. Upgrade karein: ${upgradeUrl}`,
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'WARNING',
      title: `Trial ${daysLeft} din mein khatam ho raha hai ⏰`,
      message: `Plan upgrade karein takay service jaari rahe.`,
      link: '/plan',
    });
  }

  private async sendTrialExpiredEmail(sub: any) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    const upgradeUrl = `${process.env.APP_URL || 'https://app.nafaa.pk'}/plan`;

    await this.email.send({
      tenantId: sub.tenantId,
      toEmail: owner.email,
      toName: owner.fullName,
      subject: `❌ Aap ka Nafaa trial khatam ho gaya — upgrade zaroori`,
      bodyHtml: this.trialExpiredTemplate({
        name: owner.fullName,
        shopName: sub.tenant.name,
        upgradeUrl,
      }),
      bodyText: `Aap ka trial khatam ho gaya. Upgrade: ${upgradeUrl}`,
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'ERROR',
      title: 'Trial Khatam Ho Gaya ❌',
      message: 'Service jaari rakhne ke liye plan upgrade karein.',
      link: '/plan',
    });
  }

  private async sendPastDueEmail(sub: any) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    const billingUrl = `${process.env.APP_URL || 'https://app.nafaa.pk'}/billing`;

    await this.email.send({
      tenantId: sub.tenantId,
      toEmail: owner.email,
      toName: owner.fullName,
      subject: `⚠️ Payment due — 3 din ka grace period chal raha hai`,
      bodyHtml: `<p>${owner.fullName}, aap ki subscription expire ho gayi hai. 3 din grace period mein renew kar dein.</p><a href="${billingUrl}">Renew Now</a>`,
      bodyText: `Renew: ${billingUrl}`,
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'WARNING',
      title: 'Subscription Past Due ⚠️',
      message: '3 din ka grace period chal raha hai. Renew karein.',
      link: '/billing',
    });
  }

  private async sendFullExpiredEmail(sub: any) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    const upgradeUrl = `${process.env.APP_URL || 'https://app.nafaa.pk'}/plan`;

    await this.email.send({
      tenantId: sub.tenantId,
      toEmail: owner.email,
      toName: owner.fullName,
      subject: `🚫 Service Suspended — Grace period khatam`,
      bodyHtml: `<p>${owner.fullName}, aap ki subscription ka grace period bhi khatam ho gaya. Service suspended hai jab tak renew nahi karte.</p><a href="${upgradeUrl}">Reactivate</a>`,
      bodyText: `Reactivate: ${upgradeUrl}`,
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'ERROR',
      title: 'Service Suspended 🚫',
      message: 'Grace period khatam. Reactivate karein.',
      link: '/plan',
    });
  }

  private trialWarningTemplate(args: { name: string; shopName: string; daysLeft: number; upgradeUrl: string }) {
    return `
<!DOCTYPE html>
<html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Arial,sans-serif">
<table width="100%" style="padding:40px 20px"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
<tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center">
  <div style="font-size:48px">⏰</div>
  <h1 style="color:#fff;margin:8px 0 0;font-size:24px">${args.daysLeft} ${args.daysLeft === 1 ? 'Din' : 'Din'} Left!</h1>
  <p style="color:#fde68a;margin:6px 0 0">${args.shopName}</p>
</td></tr>
<tr><td style="padding:32px;text-align:center">
  <p style="font-size:16px;color:#475569">Assalam-o-Alaikum <strong>${args.name}</strong>,</p>
  <p style="font-size:15px;color:#475569;line-height:1.6">
    Aap ka Nafaa free trial <strong style="color:#d97706">${args.daysLeft} din</strong> mein khatam ho jayega.
    Service jaari rakhne ke liye plan upgrade karein.
  </p>
  <a href="${args.upgradeUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;margin:24px 0">Upgrade Now →</a>
  <p style="font-size:13px;color:#94a3b8;margin-top:24px">Sirf Rs 1,500/mo se shuru — Pakistan-first POS</p>
</td></tr>
</table></td></tr></table></body></html>`;
  }

  private trialExpiredTemplate(args: { name: string; shopName: string; upgradeUrl: string }) {
    return `
<!DOCTYPE html>
<html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Arial,sans-serif">
<table width="100%" style="padding:40px 20px"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;text-align:center">
  <div style="font-size:48px">❌</div>
  <h1 style="color:#fff;margin:8px 0 0">Trial Expired</h1>
  <p style="color:#fecaca;margin:6px 0 0">${args.shopName}</p>
</td></tr>
<tr><td style="padding:32px;text-align:center">
  <p>Assalam-o-Alaikum <strong>${args.name}</strong>,</p>
  <p style="color:#475569;line-height:1.6">
    Aap ka Nafaa free trial expire ho gaya. Apni dukan ka data safe hai —
    plan upgrade karein aur turant access wapas hasil karein.
  </p>
  <a href="${args.upgradeUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;margin:24px 0">Choose Plan →</a>
</td></tr>
</table></td></tr></table></body></html>`;
  }
}
