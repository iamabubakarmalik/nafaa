import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { UsedPhonesController } from './used-phones.controller';
import { UsedPhonesService } from './used-phones.service';

@Module({
  imports: [PrismaModule, SalesModule],
  controllers: [UsedPhonesController],
  providers: [UsedPhonesService],
  exports: [UsedPhonesService],
})
export class UsedPhonesModule {}
