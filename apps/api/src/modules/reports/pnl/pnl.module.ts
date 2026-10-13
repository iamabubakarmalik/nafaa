import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { MoneyService } from '../../finance/money/money.service';
import { PnlController } from './pnl.controller';
import { PnlService } from './pnl.service';

@Module({
  controllers: [PnlController],
  providers: [PnlService, MoneyService, TenantTimezoneService],
})
export class PnlModule {}
