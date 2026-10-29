import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { ManufacturingController } from './manufacturing.controller';
import { ManufacturingService } from './manufacturing.service';

@Module({
  controllers: [ManufacturingController],
  providers: [ManufacturingService, TenantTimezoneService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
