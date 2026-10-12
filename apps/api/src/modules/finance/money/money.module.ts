import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { MoneyController } from './money.controller';
import { MoneyService } from './money.service';

@Module({
  controllers: [MoneyController],
  providers: [MoneyService, TenantTimezoneService],
})
export class MoneyModule {}
