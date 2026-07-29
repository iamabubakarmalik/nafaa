import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { IntegrationCoreModule } from '../../core/integration.module';
import { FoodpandaController } from './foodpanda.controller';
import { FoodpandaService } from './foodpanda.service';

@Module({
  imports: [PrismaModule, IntegrationCoreModule],
  controllers: [FoodpandaController],
  providers: [FoodpandaService],
})
export class FoodpandaModule {}
