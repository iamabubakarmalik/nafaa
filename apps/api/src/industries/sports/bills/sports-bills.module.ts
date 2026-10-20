import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { SportsBillVoidService } from './sports-bill-void.service';

/** Listens for voided team-order and repair bills. */
@Module({
  imports: [SalesModule],
  providers: [SportsBillVoidService],
})
export class SportsBillsModule {}
