import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { IntegrationCoreModule } from '../../core/integration.module';
import { DarazController } from './daraz.controller';
import { DarazService } from './daraz.service';

@Module({
  imports: [PrismaModule, IntegrationCoreModule],
  controllers: [DarazController],
  providers: [DarazService],
})
export class DarazModule {}
