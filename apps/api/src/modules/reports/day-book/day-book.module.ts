import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { DayBookController } from './day-book.controller';
import { DayBookQueries } from './day-book.queries';
import { DayBookService } from './day-book.service';

@Module({
  controllers: [DayBookController],
  providers: [DayBookService, DayBookQueries, TenantTimezoneService],
})
export class DayBookModule {}
