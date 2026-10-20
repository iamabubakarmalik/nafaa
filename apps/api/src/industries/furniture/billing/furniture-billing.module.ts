import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { FurnitureBillVoidService } from './furniture-bill-void.service';

@Module({ imports: [SalesModule], providers: [FurnitureBillVoidService] })
export class FurnitureBillingModule {}
