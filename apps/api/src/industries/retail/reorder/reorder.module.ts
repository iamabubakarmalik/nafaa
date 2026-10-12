import { Module } from '@nestjs/common';
import { ReorderController } from './reorder.controller';
import { ReorderService } from './reorder.service';
import { LowStockModule } from '../../../modules/inventory/low-stock/low-stock.module';

@Module({
  imports: [LowStockModule],
  controllers: [ReorderController],
  providers: [ReorderService],
  exports: [ReorderService],
})
export class ReorderModule {}
