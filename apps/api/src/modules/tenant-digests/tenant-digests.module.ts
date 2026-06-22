import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { TenantDigestsService } from './tenant-digests.service';
import { TenantDigestsCronService } from './tenant-digests-cron.service';
import { TenantDigestsController } from './tenant-digests.controller';

@Module({
  imports: [EmailModule],
  controllers: [TenantDigestsController],
  providers: [TenantDigestsService, TenantDigestsCronService],
  exports: [TenantDigestsService],
})
export class TenantDigestsModule {}
