import { Module } from '@nestjs/common';
import { AdminSalesController } from './admin-sales.controller';
import { AdminSalesService } from './admin-sales.service';

@Module({
  controllers: [AdminSalesController],
  providers: [AdminSalesService],
})
export class AdminSalesModule {}
