import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { MobileReportsController } from './mobile-reports.controller';
import { MobileReportsService } from './mobile-reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [MobileReportsController],
  providers: [MobileReportsService],
  exports: [MobileReportsService],
})
export class MobileReportsModule {}
