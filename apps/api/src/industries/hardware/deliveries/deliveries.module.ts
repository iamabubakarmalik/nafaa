import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({ imports: [SalesModule], controllers: [DeliveriesController], providers: [DeliveriesService], exports: [DeliveriesService] })
export class HardwareDeliveriesModule {}
