import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, TenantTimezoneService],
})
export class ExportsModule {}
