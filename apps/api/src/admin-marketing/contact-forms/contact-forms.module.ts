import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../../modules/email/email.module';
import { SmsModule } from '../../modules/sms/sms.module';
import { ContactFormsController } from './contact-forms.controller';
import { ContactFormsService } from './contact-forms.service';

@Module({
  imports: [PrismaModule, EmailModule, SmsModule],
  controllers: [ContactFormsController],
  providers: [ContactFormsService],
  exports: [ContactFormsService],
})
export class ContactFormsModule {}
