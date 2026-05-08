import { Module } from '@nestjs/common';
import { BillingAdminController } from './billing-admin.controller';
import { BillingAdminService } from './billing-admin.service';

@Module({
  controllers: [BillingAdminController],
  providers: [BillingAdminService],
})
export class BillingAdminModule {}
