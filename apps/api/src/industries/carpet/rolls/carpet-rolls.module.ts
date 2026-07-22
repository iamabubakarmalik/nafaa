import { Module } from '@nestjs/common';
import { CarpetRollsController } from './carpet-rolls.controller';
import { CarpetRollsService } from './carpet-rolls.service';

@Module({
  controllers: [CarpetRollsController],
  providers: [CarpetRollsService],
  exports: [CarpetRollsService],
})
export class CarpetRollsModule {}
