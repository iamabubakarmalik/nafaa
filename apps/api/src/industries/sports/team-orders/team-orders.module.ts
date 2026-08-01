import { Module } from '@nestjs/common';
import { TeamOrdersController } from './team-orders.controller';
import { TeamOrdersService } from './team-orders.service';

@Module({
  controllers: [TeamOrdersController],
  providers: [TeamOrdersService],
  exports: [TeamOrdersService],
})
export class TeamOrdersModule {}
