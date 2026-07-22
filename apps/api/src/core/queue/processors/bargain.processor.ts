import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.BARGAIN)
export class BargainProcessor extends WorkerHost {
  private readonly logger = new Logger(BargainProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
  ) { super(); }

  async process(job: Job) {
    if (job.name === 'expire') {
      const { bargainId } = job.data;
      const bargain = await this.prisma.bargain.findUnique({ where: { id: bargainId } });
      if (!bargain) return;
      if (!['PENDING', 'COUNTER_OFFERED'].includes(bargain.status)) return;
      if (bargain.expiresAt > new Date()) return;

      await this.prisma.bargain.update({
        where: { id: bargainId },
        data: { status: 'EXPIRED' },
      });
      this.rt.emitBargainUpdate(bargainId, { status: 'EXPIRED' });
      this.logger.log(`⏰ Bargain ${bargainId} expired`);
    }
  }
}
