import { Module } from '@nestjs/common';
import { DamageController } from './damage.controller';
import { DamageService } from './damage.service';

@Module({
  controllers: [DamageController],
  providers: [DamageService],
  exports: [DamageService],
})
export class DamageModule {}
