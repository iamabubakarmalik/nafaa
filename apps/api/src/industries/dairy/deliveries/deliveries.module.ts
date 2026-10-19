import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { DairyDeliveriesController } from './deliveries.controller';
import { DairyDeliveriesService } from './deliveries.service';
import { DairyDeliveryVoidService } from './delivery-void.service';

@Module({
  imports: [SalesModule],
  controllers: [DairyDeliveriesController],
  providers: [DairyDeliveriesService, DairyDeliveryVoidService],
  exports: [DairyDeliveriesService],
})
export class DairyDeliveriesModule {}
