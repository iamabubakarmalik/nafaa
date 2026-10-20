import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { GamingBillVoidService } from './gaming-bill-void.service';

@Module({ imports: [SalesModule], providers: [GamingBillVoidService] })
export class GamingBillingModule {}
