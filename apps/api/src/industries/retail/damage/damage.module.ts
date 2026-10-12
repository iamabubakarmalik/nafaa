import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { DamageController } from './damage.controller';
import { DamageService } from './damage.service';

@Module({
  controllers: [DamageController],
  providers: [DamageService, TenantTimezoneService],
  exports: [DamageService],
})
export class DamageModule {}
