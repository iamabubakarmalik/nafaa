import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ReturnsController } from './returns.controller';
import { ReturnsRecordsService } from './returns-records.service';
import { ReturnsService } from './returns.service';

@Module({
  controllers: [ReturnsController],
  providers: [ReturnsService, ReturnsRecordsService, TenantTimezoneService],
})
export class ReturnsModule {}
