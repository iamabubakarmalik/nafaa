import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, TenantTimezoneService],
})
export class BrandsModule {}
