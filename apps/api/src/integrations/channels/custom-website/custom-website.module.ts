import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { IntegrationCoreModule } from '../../core/integration.module';
import { CustomWebsiteController } from './custom-website.controller';
import { CustomWebsiteService } from './custom-website.service';

@Module({
  imports: [PrismaModule, IntegrationCoreModule],
  controllers: [CustomWebsiteController],
  providers: [CustomWebsiteService],
})
export class CustomWebsiteModule {}
