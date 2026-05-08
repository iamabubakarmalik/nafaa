import { Module } from '@nestjs/common';
import { AdminReferralsController } from './admin-referrals.controller';
import { AdminReferralsService } from './admin-referrals.service';

@Module({
  controllers: [AdminReferralsController],
  providers: [AdminReferralsService],
})
export class AdminReferralsModule {}
