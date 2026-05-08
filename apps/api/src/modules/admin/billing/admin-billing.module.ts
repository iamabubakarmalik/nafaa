import { Module } from '@nestjs/common';
import { EmailModule } from '../../email/email.module';
import { SmsModule } from '../../sms/sms.module';
import { AdminBillingController } from './admin-billing.controller';
import { AdminBillingService } from './admin-billing.service';

@Module({
  imports: [EmailModule, SmsModule],
  controllers: [AdminBillingController],
  providers: [AdminBillingService],
})
export class AdminBillingModule {}
