import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { HeatmapsController } from './heatmaps.controller';
import { HeatmapsService } from './heatmaps.service';

@Module({
  imports: [PrismaModule],
  controllers: [HeatmapsController],
  providers: [HeatmapsService],
  exports: [HeatmapsService],
})
export class HeatmapsModule {}
