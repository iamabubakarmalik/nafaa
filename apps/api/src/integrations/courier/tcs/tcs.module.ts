import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TcsController } from './tcs.controller';
import { TcsService } from './tcs.service';

@Module({
  imports: [PrismaModule],
  controllers: [TcsController],
  providers: [TcsService],
  exports: [TcsService],
})
export class TcsModule {}
