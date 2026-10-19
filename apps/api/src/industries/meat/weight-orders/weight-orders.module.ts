import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { MeatOrderBillVoidService } from './order-bill-void.service';
import { WeightOrdersController } from './weight-orders.controller';
import { WeightOrdersService } from './weight-orders.service';

@Module({ imports: [SalesModule], controllers: [WeightOrdersController], providers: [WeightOrdersService, MeatOrderBillVoidService], exports: [WeightOrdersService] })
export class WeightOrdersModule {}
