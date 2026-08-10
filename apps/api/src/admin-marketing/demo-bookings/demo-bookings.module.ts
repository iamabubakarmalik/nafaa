import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../../modules/email/email.module';
import { SmsModule } from '../../modules/sms/sms.module';
import { DemoBookingsController } from './demo-bookings.controller';
import { DemoBookingsService } from './demo-bookings.service';

@Module({
  imports: [PrismaModule, EmailModule, SmsModule],
  controllers: [DemoBookingsController],
  providers: [DemoBookingsService],
  exports: [DemoBookingsService],
})
export class DemoBookingsModule {}
