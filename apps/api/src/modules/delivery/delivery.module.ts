import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DeliveryController } from './delivery.controller';
import { RiderAppController } from './rider-app.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryController, RiderAppController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
