import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { QueueService } from '../queue.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
    private readonly queue: QueueService,
  ) { super(); }

  async process(job: Job) {
    const data = job.data;

    if (job.name !== 'dispatch') return;

    const channels: string[] = data.channels ?? ['IN_APP', 'PUSH'];

    // Customer notification
    if (data.customerId) {
      const customer = await this.prisma.marketplaceCustomer.findUnique({
        where: { id: data.customerId },
        select: {
          phone: true, email: true, fullName: true,
          marketingEmails: true, marketingSms: true,
          marketingPush: true, marketingWhatsapp: true,
        },
      });
      if (!customer) return;

      // IN_APP (always create)
      if (channels.includes('IN_APP')) {
        const notification = await this.prisma.customerNotification.create({
          data: {
            customerId: data.customerId,
            type: data.type,
            title: data.title,
            body: data.body,
            imageUrl: data.imageUrl,
            actionUrl: data.actionUrl,
            data: data.data,
            channel: 'IN_APP',
          },
        });
        this.rt.emitNotification(data.customerId, notification);
      }

      // PUSH
      if (channels.includes('PUSH') && customer.marketingPush) {
        const tokens = await this.prisma.customerPushToken.findMany({
          where: { customerId: data.customerId, isActive: true },
          select: { token: true },
        });
        if (tokens.length) {
          await this.queue.sendPush({
            tokens: tokens.map((t) => t.token),
            title: data.title,
            body: data.body,
            imageUrl: data.imageUrl,
            data: data.data,
          });
        }
      }

      // SMS
      if (channels.includes('SMS') && customer.marketingSms && customer.phone) {
        await this.queue.sendSms({
          toPhone: customer.phone,
          message: `${data.title}: ${data.body}`,
        });
      }

      // EMAIL
      if (channels.includes('EMAIL') && customer.marketingEmails && customer.email) {
        await this.queue.sendEmail({
          templateSlug: 'generic-notification',
          toEmail: customer.email,
          toName: customer.fullName,
          variables: {
            title: data.title, body: data.body, actionUrl: data.actionUrl,
          },
        });
      }
    }

    this.logger.log(`🔔 Notification dispatched: ${data.type} → ${data.customerId ?? data.tenantId}`);
  }
}
