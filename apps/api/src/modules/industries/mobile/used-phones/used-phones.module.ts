import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { UsedPhonesController } from './used-phones.controller';
import { UsedPhonesService } from './used-phones.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsedPhonesController],
  providers: [UsedPhonesService],
  exports: [UsedPhonesService],
})
export class UsedPhonesModule {}
