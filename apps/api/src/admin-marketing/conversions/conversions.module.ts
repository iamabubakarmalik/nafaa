import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversionsController } from './conversions.controller';
import { ConversionsService } from './conversions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConversionsController],
  providers: [ConversionsService],
  exports: [ConversionsService],
})
export class ConversionsModule {}
