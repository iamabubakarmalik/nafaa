import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.WHATSAPP)
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  async process(job: Job) {
    // TODO: integrate WhatsApp Business API — placeholder
    this.logger.log(`💬 WhatsApp (mock) → ${job.data.toPhone}`);
    return { sent: true };
  }
}
