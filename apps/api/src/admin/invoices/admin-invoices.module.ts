import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../../modules/billing/subscriptions/subscriptions.module';
import { AdminInvoicesController } from './admin-invoices.controller';
import { AdminInvoicesService } from './admin-invoices.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AdminInvoicesController],
  providers: [AdminInvoicesService],
})
export class AdminInvoicesModule {}
