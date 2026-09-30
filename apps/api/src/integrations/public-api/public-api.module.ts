import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApiKeysService } from './api-keys.service';
import { PublicApiService } from './public-api.service';
import { WebhooksService } from './webhooks.service';
import { DeveloperController, PublicApiController } from './public-api.controller';

/** Nafaa Public API v1 + webhooks (Zapier, Make, apna ERP) */
@Module({
  imports: [PrismaModule],
  controllers: [PublicApiController, DeveloperController],
  providers: [ApiKeysService, PublicApiService, WebhooksService],
})
export class PublicApiModule {}
