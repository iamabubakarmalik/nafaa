import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ProductUnitsController } from './product-units.controller';
import { ProductUnitsService } from './product-units.service';

@Module({
  controllers: [ProductUnitsController],
  providers: [ProductUnitsService, TenantTimezoneService],
  exports: [ProductUnitsService],
})
export class ProductUnitsModule {}
