import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleModule } from '../google/google.controller';
import { MetaGraphService } from './meta-graph.service';
import { MetaService } from './meta.service';
import { MetaInboxService } from './meta-inbox.service';
import { MetaPublishService } from './meta-publish.service';
import { MetaCatalogService } from './meta-catalog.service';
import { MetaController, MetaInboxController, MetaPublicController, MetaSocialController } from './meta.controller';

/**
 * Meta (Facebook / Instagram) integration: connection and Graph calls
 * (shared with the ads and WhatsApp parts), Social studio auto-publishing,
 * the unified inbox and catalog sync. Notifications come from the global
 * NotificationsModule.
 *
 * Exports MetaGraphService (Graph calls with stored tokens), MetaService
 * (connection view, manager check) and MetaInboxService
 * (registerWebhookHandler for 'whatsapp_business_account').
 */
@Module({
  imports: [PrismaModule, GoogleModule],
  controllers: [MetaPublicController, MetaController, MetaInboxController, MetaSocialController],
  providers: [MetaGraphService, MetaService, MetaInboxService, MetaPublishService, MetaCatalogService],
  exports: [MetaGraphService, MetaService, MetaInboxService],
})
export class MetaModule {}
