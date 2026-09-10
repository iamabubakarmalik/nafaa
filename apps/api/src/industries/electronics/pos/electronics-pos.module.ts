import { Module } from '@nestjs/common';
import { ElectronicsPosController } from './electronics-pos.controller';
import { ElectronicsPosService } from './electronics-pos.service';

@Module({
  controllers: [ElectronicsPosController],
  providers: [ElectronicsPosService],
  exports: [ElectronicsPosService],
})
export class ElectronicsPosModule {}
