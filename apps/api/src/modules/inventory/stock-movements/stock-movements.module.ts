import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { Module } from '@nestjs/common';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  controllers: [StockMovementsController],
  providers: [StockMovementsService, TenantTimezoneService],
})
export class StockMovementsModule {}
