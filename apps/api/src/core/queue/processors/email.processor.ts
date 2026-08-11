import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../../modules/email/email.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  constructor(
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) { super(); }

  async process(job: Job) {
    // ── Marketing: newsletter batch ──
    if (job.name === 'newsletter-batch') {
      return this.handleNewsletterBatch(job);
    }

    // ── Marketing: campaign email batch ──
    if (job.name === 'campaign-batch') {
      return this.handleCampaignBatch(job);
    }

    // ── Existing single-email flow ──
    try {
      await this.email.send(job.data);
      this.logger.log(`📧 Email sent: ${job.data.templateSlug ?? job.data.subject} → ${job.data.toEmail}`);
    } catch (e: any) {
      this.logger.error(`Email failed: ${e.message}`);
      throw e;
    }
  }

  /**
   * Newsletter batch: { newsletterId, subject, html, preheader, recipients: [{id, email, firstName, lastName}] }
   */
  private async handleNewsletterBatch(job: Job) {
    const { newsletterId, subject, html, preheader, recipients } = job.data;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      this.logger.warn(`newsletter-batch ${newsletterId}: empty recipients`);
      return { sent: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      try {
        const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || undefined;
        // Personalise greeting
        const personalised = (html as string).replace(
          /\{\{name\}\}/gi,
          name ?? 'Dost',
        );
        const withPreheader = preheader
          ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>${personalised}`
          : personalised;

        await this.email.send({
          toEmail: r.email,
          toName: name,
          subject,
          bodyHtml: withPreheader,
        });
        sent++;

        // Mark NewsletterEmailLog as opened-tracking ready (status already SENT)
        await this.prisma.newsletterEmailLog
          .updateMany({
            where: { subscriberId: r.id, subject },
            data: { sentAt: new Date() },
          })
          .catch(() => null);
      } catch (e: any) {
        failed++;
        this.logger.error(`Newsletter → ${r.email} failed: ${e.message}`);
        // Mark subscriber bounced on hard failure
        await this.prisma.newsletterSubscriber
          .update({
            where: { id: r.id },
            data: { totalEmailsSent: { increment: 1 } },
          })
          .catch(() => null);
      }
    }

    this.logger.log(
      `📬 Newsletter ${newsletterId}: batch done — sent=${sent} failed=${failed}`,
    );
    return { sent, failed };
  }

  /**
   * Campaign batch: { campaignId, subject, html, preheader, recipients: [{id, email, firstName, lastName, name}] }
   */
  private async handleCampaignBatch(job: Job) {
    const { campaignId, subject, html, preheader, recipients } = job.data;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      this.logger.warn(`campaign-batch ${campaignId}: empty recipients`);
      return { sent: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      try {
        const name = r.name ?? [r.firstName, r.lastName].filter(Boolean).join(' ') ?? undefined;
        const personalised = (html as string).replace(
          /\{\{name\}\}/gi,
          name ?? 'Dost',
        );
        const withPreheader = preheader
          ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>${personalised}`
          : personalised;

        await this.email.send({
          toEmail: r.email,
          toName: name,
          subject,
          bodyHtml: withPreheader,
        });
        sent++;
      } catch (e: any) {
        failed++;
        this.logger.error(`Campaign ${campaignId} → ${r.email}: ${e.message}`);
      }
    }

    // Update campaign counters
    await this.prisma.marketingCampaign
      .update({
        where: { id: campaignId },
        data: {
          totalSent: { increment: sent },
          totalBounced: { increment: failed },
          ...(sent + failed > 0
            ? {
                status: 'COMPLETED',
                completedAt: new Date(),
              }
            : {}),
        },
      })
      .catch(() => null);

    this.logger.log(
      `📢 Campaign ${campaignId}: batch done — sent=${sent} failed=${failed}`,
    );
    return { sent, failed };
  }
}
