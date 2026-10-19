import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { TailoringController } from './tailoring.controller';
import { TailoringService } from './tailoring.service';

@Module({
  imports: [SalesModule],
  controllers: [TailoringController],
  providers: [TailoringService, TenantTimezoneService],
  exports: [TailoringService],
})
export class TailoringModule {}
