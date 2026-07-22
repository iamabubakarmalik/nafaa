import { Module } from '@nestjs/common';
import { DiscountsModule } from '../discounts/discounts.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [DiscountsModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
