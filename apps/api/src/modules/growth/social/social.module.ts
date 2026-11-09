import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { SocialAiService } from './social-ai.service';

/**
 * Social media studio: content calendar, post reminders, Nafaa AI content,
 * brand kit for the creative maker, and social analytics. Notifications come
 * from the global NotificationsModule.
 */
@Module({
  imports: [PrismaModule],
  controllers: [SocialController],
  providers: [SocialService, SocialAiService, TenantTimezoneService],
})
export class SocialModule {}
