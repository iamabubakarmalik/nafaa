import { Module } from '@nestjs/common';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [DiscountsController],
  providers: [DiscountsService, TenantTimezoneService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
