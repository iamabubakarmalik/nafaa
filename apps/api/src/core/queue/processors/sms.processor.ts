import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SmsService } from '../../../modules/sms/sms.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.SMS)
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);
  constructor(private readonly sms: SmsService) { super(); }

  async process(job: Job) {
    try {
      await this.sms.send(job.data);
      this.logger.log(`📱 SMS sent → ${job.data.toPhone}`);
    } catch (e: any) {
      this.logger.error(`SMS failed: ${e.message}`);
      throw e;
    }
  }
}
