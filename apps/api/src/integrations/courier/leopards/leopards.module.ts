import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { LeopardsController } from './leopards.controller';
import { LeopardsService } from './leopards.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeopardsController],
  providers: [LeopardsService],
  exports: [LeopardsService],
})
export class LeopardsModule {}
