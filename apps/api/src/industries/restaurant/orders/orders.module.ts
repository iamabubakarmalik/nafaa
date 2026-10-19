import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RecipesModule } from '../recipes/recipes.module';
import { KotModule } from '../kot/kot.module';
import { HappyHoursModule } from '../happy-hours/happy-hours.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderReportsService } from './order-reports.service';
import { BillVoidService } from './bill-void.service';

@Module({
  imports: [RecipesModule, SalesModule, KotModule, HappyHoursModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderReportsService, BillVoidService, TenantTimezoneService],
  exports: [OrdersService],
})
export class OrdersModule {}
