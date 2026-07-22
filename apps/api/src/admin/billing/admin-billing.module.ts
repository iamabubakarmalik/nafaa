import { Module } from '@nestjs/common';
import { EmailModule } from '../../modules/email/email.module';
import { SmsModule } from '../../modules/sms/sms.module';
import { AdminBillingController } from './admin-billing.controller';
import { AdminBillingService } from './admin-billing.service';

@Module({
  imports: [EmailModule, SmsModule],
  controllers: [AdminBillingController],
  providers: [AdminBillingService],
})
export class AdminBillingModule {}
