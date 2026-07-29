import { Module } from '@nestjs/common';
import { FbrModule } from '../../../integrations/fbr/fbr.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [DiscountsModule, FbrModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
