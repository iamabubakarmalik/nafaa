import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { FbrController } from './fbr.controller';
import { FbrService } from './fbr.service';

@Global()
@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [FbrController],
  providers: [FbrService],
  exports: [FbrService],
})
export class FbrModule {}
