import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../../modules/email/email.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  constructor(private readonly email: EmailService) { super(); }

  async process(job: Job) {
    try {
      await this.email.send(job.data);
      this.logger.log(`📧 Email sent: ${job.data.templateSlug} → ${job.data.toEmail}`);
    } catch (e: any) {
      this.logger.error(`Email failed: ${e.message}`);
      throw e;
    }
  }
}
