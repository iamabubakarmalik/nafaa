import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  private get appUrl() {
    return this.config.get<string>('APP_URL') || 'http://localhost:5173';
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-PK').format(amount);
  }

  private formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'long',
      timeZone: 'Asia/Karachi',
    }).format(new Date(date));
  }

  /**
   * Runs every day at 12:00 AM Pakistan time.
   * - Mark expired trials → EXPIRED
   * - Mark expired ACTIVE subs → PAST_DUE
   * - Mark long-overdue PAST_DUE → EXPIRED (after 3-day grace)
   * - Send expiry warning emails (3 days, 1 day before)
   * - Send subscription expiring (7 days for active subs)
   */
  @Cron('0 0 * * *', { name: 'subscription-daily-check', timeZone: 'Asia/Karachi' })
  async dailyExpiryCheck() {
    this.logger.log('🕛 Running daily subscription expiry check...');

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const stats = {
      trialsExpired: 0,
      subsPastDue: 0,
      subsExpired: 0,
      trialWarnings: 0,
      subWarnings: 0,
      errors: 0,
    };

    try {
      // ─── 1. Trials that expired (status → EXPIRED) ───
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

      // ─── 2. Active subs that expired (status → PAST_DUE) ───
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

      // ─── 3. PAST_DUE longer than 3 days → EXPIRED ───
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

      // ─── 4. Trial ending in 3 days — warning ───
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
          stats.trialWarnings++;
        } catch (e) {
          stats.errors++;
        }
      }

      // ─── 5. Trial ending in 1 day — final warning ───
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
          stats.trialWarnings++;
        } catch (e) {
          stats.errors++;
        }
      }

      // ─── 6. Active sub expiring in 7 days — reminder ───
      const sub7Day = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            gte: new Date(in7Days.getTime() - 12 * 60 * 60 * 1000),
            lte: new Date(in7Days.getTime() + 12 * 60 * 60 * 1000),
          },
        },
        include: { tenant: true, plan: true },
      });

      for (const sub of sub7Day) {
        try {
          await this.sendSubscriptionExpiringEmail(sub, 7);
          stats.subWarnings++;
        } catch (e) {
          stats.errors++;
        }
      }

      this.logger.log(`✅ Daily check complete: ${JSON.stringify(stats)}`);
    } catch (e) {
      this.logger.error('Daily expiry check failed:', e);
    }

    return stats;
  }

  /**
   * Manual trigger (for admin testing)
   */
  async runNow() {
    const stats = await this.dailyExpiryCheck();
    return { success: true, message: 'Expiry check completed', stats };
  }

  // ═══════════════════════════════════════════════════════════════
  // EMAIL HELPERS — Use SEEDED TEMPLATES (not inline HTML)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Trial ending in N days — uses 'trial-expiring-soon' template
   */
  private async sendTrialEndingSoonEmail(sub: any, daysLeft: number) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    await this.email.send({
      tenantId: sub.tenantId,
      templateSlug: 'trial-expiring-soon',
      toEmail: owner.email,
      toName: owner.fullName,
      variables: {
        name: owner.fullName,
        shopName: sub.tenant.name,
        daysLeft,
        trialEndDate: this.formatDate(sub.trialEndsAt),
        appUrl: this.appUrl,
      },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'WARNING',
      title: `Trial ${daysLeft} din mein khatam ho raha hai ⏰`,
      message: `Plan upgrade karein takay service jaari rahe.`,
      link: '/plans',
    });
  }

  /**
   * Trial expired — uses 'trial-expired' template
   */
  private async sendTrialExpiredEmail(sub: any) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    await this.email.send({
      tenantId: sub.tenantId,
      templateSlug: 'trial-expired',
      toEmail: owner.email,
      toName: owner.fullName,
      variables: {
        name: owner.fullName,
        shopName: sub.tenant.name,
        appUrl: this.appUrl,
      },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'ERROR',
      title: 'Trial Khatam Ho Gaya ❌',
      message: 'Service jaari rakhne ke liye plan upgrade karein.',
      link: '/plans',
    });
  }

  /**
   * Active subscription past due (within grace period)
   * Uses 'subscription-expiring' template with daysLeft=0 indicating "due now"
   */
  private async sendPastDueEmail(sub: any) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    // Use subscription-expiring template (it handles grace messaging well)
    await this.email.send({
      tenantId: sub.tenantId,
      templateSlug: 'subscription-expiring',
      toEmail: owner.email,
      toName: owner.fullName,
      variables: {
        name: owner.fullName,
        planName: sub.plan.name,
        daysLeft: 0,
        renewalDate: this.formatDate(sub.currentPeriodEnd),
        amount: this.formatAmount(sub.amount),
        appUrl: this.appUrl,
      },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'WARNING',
      title: 'Subscription Past Due ⚠️',
      message: '3 din ka grace period chal raha hai. Renew karein.',
      link: '/billing',
    });
  }

  /**
   * Fully expired (grace period over) — uses 'trial-expired' template
   * (Same template works — generic "service suspended" message)
   */
  private async sendFullExpiredEmail(sub: any) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    await this.email.send({
      tenantId: sub.tenantId,
      templateSlug: 'trial-expired',
      toEmail: owner.email,
      toName: owner.fullName,
      variables: {
        name: owner.fullName,
        shopName: sub.tenant.name,
        appUrl: this.appUrl,
      },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'ERROR',
      title: 'Service Suspended 🚫',
      message: 'Grace period khatam. Reactivate karein.',
      link: '/plans',
    });
  }

  /**
   * Active subscription expiring in N days — uses 'subscription-expiring' template
   */
  private async sendSubscriptionExpiringEmail(sub: any, daysLeft: number) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: sub.tenantId, role: 'OWNER' },
    });
    if (!owner) return;

    await this.email.send({
      tenantId: sub.tenantId,
      templateSlug: 'subscription-expiring',
      toEmail: owner.email,
      toName: owner.fullName,
      variables: {
        name: owner.fullName,
        planName: sub.plan.name,
        daysLeft,
        renewalDate: this.formatDate(sub.currentPeriodEnd),
        amount: this.formatAmount(sub.amount),
        appUrl: this.appUrl,
      },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'INFO',
      title: `Subscription ${daysLeft} din mein renew ho gi ⏰`,
      message: `Rs ${this.formatAmount(sub.amount)} ka payment ready rakhein.`,
      link: '/billing',
    });
  }
}
