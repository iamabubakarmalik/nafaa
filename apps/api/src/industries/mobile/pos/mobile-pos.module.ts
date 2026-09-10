import { Module } from '@nestjs/common';
import { MobilePosController } from './mobile-pos.controller';
import { MobilePosService } from './mobile-pos.service';

@Module({
  controllers: [MobilePosController],
  providers: [MobilePosService],
  exports: [MobilePosService],
})
export class MobilePosModule {}
