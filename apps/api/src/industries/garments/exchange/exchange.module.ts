import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';

/** Uses the shared returns service from ReturnsModule, so there is one instance app-wide. */
@Module({
  imports: [SalesModule, ReturnsModule],
  controllers: [ExchangeController],
  providers: [ExchangeService, TenantTimezoneService],
})
export class ExchangeModule {}
