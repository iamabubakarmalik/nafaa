import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { TeamOrdersController } from './team-orders.controller';
import { TeamOrdersService } from './team-orders.service';

@Module({
  imports: [SalesModule],
  controllers: [TeamOrdersController],
  providers: [TeamOrdersService],
  exports: [TeamOrdersService],
})
export class TeamOrdersModule {}
