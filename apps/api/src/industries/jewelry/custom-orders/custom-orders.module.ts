import { Module } from '@nestjs/common';
import { SalesModule as CoreSalesModule } from '../../../modules/sales/sales/sales.module';
import { CustomOrdersController } from './custom-orders.controller';
import { CustomOrdersService } from './custom-orders.service';

@Module({ imports: [CoreSalesModule], controllers: [CustomOrdersController], providers: [CustomOrdersService], exports: [CustomOrdersService] })
export class CustomOrdersModule {}
