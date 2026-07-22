import { Module } from '@nestjs/common';
import { AdminEmailTemplatesController } from './admin-email-templates.controller';
import { AdminEmailTemplatesService } from './admin-email-templates.service';

@Module({
  controllers: [AdminEmailTemplatesController],
  providers: [AdminEmailTemplatesService],
})
export class AdminEmailTemplatesModule {}
