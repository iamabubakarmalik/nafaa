import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TenantDigestsService } from './tenant-digests.service';

@Injectable()
export class TenantDigestsCronService {
  private readonly logger = new Logger('TenantDigestsCron');

  constructor(private readonly digests: TenantDigestsService) {}

  /**
   * Daily 9:00 AM Pakistan time — Low stock digest
   */
  @Cron('0 9 * * *', { name: 'low-stock-digest', timeZone: 'Asia/Karachi' })
  async handleLowStockDigest() {
    this.logger.log('⏰ 9:00 AM — Running low stock digest cron');
    try {
      const result = await this.digests.runLowStockDigest();
      this.logger.log(`✅ Low stock digest: ${result.sent}/${result.total}`);
    } catch (e: any) {
      this.logger.error(`❌ Low stock cron failed: ${e.message}`);
    }
  }

  /**
   * Daily 9:00 PM Pakistan time — Daily sales summary
   */
  @Cron('0 21 * * *', { name: 'daily-sales-summary', timeZone: 'Asia/Karachi' })
  async handleDailySummary() {
    this.logger.log('⏰ 9:00 PM — Running daily summary cron');
    try {
      const result = await this.digests.runDailySummary();
      this.logger.log(`✅ Daily summary: ${result.sent}/${result.total}`);
    } catch (e: any) {
      this.logger.error(`❌ Daily summary cron failed: ${e.message}`);
    }
  }
}
