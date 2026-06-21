import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { EmiController } from './emi.controller';
import { EmiService } from './emi.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmiController],
  providers: [EmiService],
  exports: [EmiService],
})
export class EmiModule {}
