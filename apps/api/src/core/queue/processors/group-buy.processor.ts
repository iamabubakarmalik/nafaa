import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from '../queue.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.GROUP_BUY)
export class GroupBuyProcessor extends WorkerHost {
  private readonly logger = new Logger(GroupBuyProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) { super(); }

  async process(job: Job) {
    if (job.name !== 'expire') return;
    const { groupBuyId } = job.data;
    const gb = await this.prisma.groupBuy.findUnique({
      where: { id: groupBuyId },
      include: { participants: true },
    });
    if (!gb) return;
    if (gb.status !== 'ACTIVE') return;

    const targetMet = gb.currentCount >= gb.minParticipants;
    const finalStatus = targetMet ? 'SUCCESS' : 'FAILED';

    await this.prisma.groupBuy.update({
      where: { id: groupBuyId },
      data: {
        status: finalStatus,
        reachedTargetAt: targetMet ? new Date() : null,
      },
    });

    // Notify all participants
    for (const p of gb.participants) {
      await this.queue.createNotification({
        customerId: p.customerId,
        type: targetMet ? 'GROUP_BUY_SUCCESS' : 'GROUP_BUY_FAILED',
        title: targetMet ? '🎉 Group buy successful!' : '😔 Group buy failed',
        body: targetMet
          ? `${gb.productName} — aap ka discount confirm hai`
          : `${gb.productName} — target nahi hua, aap ka amount refund ho jayega`,
        data: { groupBuyId },
        channels: ['PUSH', 'IN_APP'],
      });
    }

    this.logger.log(`👥 Group buy ${groupBuyId} → ${finalStatus} (${gb.currentCount}/${gb.minParticipants})`);
  }
}
