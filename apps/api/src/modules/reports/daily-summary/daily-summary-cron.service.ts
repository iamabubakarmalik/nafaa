import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailySummaryService } from './daily-summary.service';

/** How late a summary may still go out, e.g. after a restart. */
const CATCH_UP_MINUTES = 180;

/**
 * Checks every five minutes which shops have reached their own summary time
 * (Settings, in the shop's timezone) and sends each one once per business day.
 */
@Injectable()
export class DailySummaryCronService {
  private readonly logger = new Logger('DailySummaryCron');
  private running = false;

  constructor(private readonly summaries: DailySummaryService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'daily-closing-summary' })
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const res = await this.summaries.runDue(CATCH_UP_MINUTES);
      if (res.sent) this.logger.log(`Daily summary sent to ${res.sent} people`);
    } catch (e: any) {
      this.logger.error(`Daily summary run failed: ${e?.message}`);
    } finally {
      this.running = false;
    }
  }
}
