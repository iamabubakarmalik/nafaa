import { Module } from '@nestjs/common';
import { DairyProductionController } from './production.controller';
import { DairyProductionService } from './production.service';

@Module({
  controllers: [DairyProductionController],
  providers: [DairyProductionService],
})
export class DairyProductionModule {}
