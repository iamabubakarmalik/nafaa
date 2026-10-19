import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({ imports: [OrdersModule], controllers: [DeliveryController], providers: [DeliveryService, ExpensesService, TenantTimezoneService], exports: [DeliveryService] })
export class DeliveryModule {}
