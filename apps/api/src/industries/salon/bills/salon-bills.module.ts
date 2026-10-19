import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { SalonBillsController } from './salon-bills.controller';
import { SalonBillsService } from './salon-bills.service';
import { SalonBillVoidService } from './salon-bill-void.service';

@Module({
  imports: [SalesModule],
  controllers: [SalonBillsController],
  providers: [SalonBillsService, SalonBillVoidService],
  exports: [SalonBillsService],
})
export class SalonBillsModule {}
