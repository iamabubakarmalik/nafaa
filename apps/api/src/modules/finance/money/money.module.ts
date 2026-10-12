import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { MoneyController } from './money.controller';
import { MoneyService } from './money.service';
import { MoneyAccountsController } from './money-accounts.controller';
import { MoneyAccountsService } from './money-accounts.service';

@Module({
  controllers: [MoneyController, MoneyAccountsController],
  providers: [MoneyService, MoneyAccountsService, TenantTimezoneService],
})
export class MoneyModule {}
