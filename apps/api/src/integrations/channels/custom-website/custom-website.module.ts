import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { IntegrationCoreModule } from '../../core/integration.module';
import { OnlineOrdersModule } from '../../online-orders/online-orders.module';
import { CustomWebsiteController } from './custom-website.controller';

@Module({
  imports: [PrismaModule, IntegrationCoreModule, OnlineOrdersModule],
  controllers: [CustomWebsiteController],
})
export class CustomWebsiteModule {}
