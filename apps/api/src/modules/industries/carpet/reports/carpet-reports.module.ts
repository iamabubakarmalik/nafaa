import { Module } from '@nestjs/common';
import { CarpetReportsController } from './carpet-reports.controller';
import { CarpetReportsService } from './carpet-reports.service';

@Module({
  controllers: [CarpetReportsController],
  providers: [CarpetReportsService],
  exports: [CarpetReportsService],
})
export class CarpetReportsModule {}
