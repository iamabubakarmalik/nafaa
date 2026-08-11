import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SmsService } from '../../../modules/sms/sms.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.SMS)
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);
  constructor(
    private readonly sms: SmsService,
    private readonly prisma: PrismaService,
  ) { super(); }

  async process(job: Job) {
    // ── Marketing: campaign SMS batch ──
    if (job.name === 'campaign-sms-batch') {
      return this.handleCampaignSmsBatch(job);
    }

    // ── Existing single-SMS flow ──
    try {
      await this.sms.send(job.data);
      this.logger.log(`📱 SMS sent → ${job.data.toPhone}`);
    } catch (e: any) {
      this.logger.error(`SMS failed: ${e.message}`);
      throw e;
    }
  }

  /**
   * Campaign SMS batch: { campaignId, message, recipients: [{id, phone, email}] }
   */
  private async handleCampaignSmsBatch(job: Job) {
    const { campaignId, message, recipients } = job.data;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      this.logger.warn(`campaign-sms-batch ${campaignId}: empty recipients`);
      return { sent: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      if (!r.phone) { failed++; continue; }
      try {
        await this.sms.send({ toPhone: r.phone, message });
        sent++;
      } catch (e: any) {
        failed++;
        this.logger.error(`SMS campaign ${campaignId} → ${r.phone}: ${e.message}`);
      }
    }

    // Update campaign counters
    await this.prisma.marketingCampaign
      .update({
        where: { id: campaignId },
        data: {
          totalSent: { increment: sent },
          totalBounced: { increment: failed },
        },
      })
      .catch(() => null);

    this.logger.log(
      `📱 Campaign SMS ${campaignId}: sent=${sent} failed=${failed}`,
    );
    return { sent, failed };
  }
}
