import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { CarpetBillsController } from './carpet-bills.controller';
import { CarpetBillsService } from './carpet-bills.service';

@Module({
  imports: [SalesModule, ReturnsModule],
  controllers: [CarpetBillsController],
  providers: [CarpetBillsService],
})
export class CarpetBillsModule {}
