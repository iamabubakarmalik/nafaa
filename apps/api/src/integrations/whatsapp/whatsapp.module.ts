import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationCoreModule } from '../core/integration.module';
import { MetaGraphService } from '../meta/meta-graph.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

/**
 * WhatsApp Cloud API: order messages, templates and the reply webhook.
 * MetaModule and OnlineOrdersModule are not imported at file level (they
 * would change the online-orders load order); their services are looked up
 * through ModuleRef when the app starts.
 */
@Module({
  imports: [PrismaModule, IntegrationCoreModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, MetaGraphService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
