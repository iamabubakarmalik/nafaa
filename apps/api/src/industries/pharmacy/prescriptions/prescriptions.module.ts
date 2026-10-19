import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { ControlledLogModule } from '../controlled-log/controlled-log.module';

@Module({
  imports: [SalesModule, ControlledLogModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, TenantTimezoneService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
