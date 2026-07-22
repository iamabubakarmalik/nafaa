import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FbrController } from './fbr.controller';
import { FbrService } from './fbr.service';

@Module({
  imports: [PrismaModule],
  controllers: [FbrController],
  providers: [FbrService],
  exports: [FbrService],
})
export class FbrModule {}
