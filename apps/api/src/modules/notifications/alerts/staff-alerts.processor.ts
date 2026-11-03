import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../core/queue/queue.constants';
import { StaffAlertsService } from './staff-alerts.service';

/** Delayed staff alert work: sale summary pushes. */
@Processor(QUEUE_NAMES.STAFF_ALERTS)
export class StaffAlertsProcessor extends WorkerHost {
  constructor(private readonly alerts: StaffAlertsService) {
    super();
  }

  process(job: Job) {
    if (job.name === 'sale-digest') return this.alerts.sendDigest(job.data);
    return Promise.resolve(null);
  }
}
