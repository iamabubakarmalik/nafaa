import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShopPublishingController } from './shop-publishing.controller';
import { ShopPublishingService } from './shop-publishing.service';
import { ProductPublishingController } from './product-publishing.controller';
import { ProductPublishingService } from './product-publishing.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopPublishingController, ProductPublishingController],
  providers: [ShopPublishingService, ProductPublishingService],
  exports: [ShopPublishingService, ProductPublishingService],
})
export class PublishingModule {}
