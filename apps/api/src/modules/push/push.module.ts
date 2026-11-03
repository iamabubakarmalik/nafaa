import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PushDeliveryService } from './push-delivery.service';

@Module({
  imports: [PrismaModule],
  controllers: [PushController],
  providers: [PushService, PushDeliveryService],
  exports: [PushService, PushDeliveryService],
})
export class PushModule {}
