import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../core/queue/queue.constants';
import { MobilePushService } from './mobile-push.service';

/** One broadcast at a time per server; batching and pauses live in the service. */
@Processor(QUEUE_NAMES.MOBILE_PUSH, { concurrency: 1 })
export class MobilePushProcessor extends WorkerHost {
  constructor(private readonly svc: MobilePushService) {
    super();
  }

  process(job: Job<{ broadcastId: string }>) {
    return this.svc.process(job.data.broadcastId);
  }
}
