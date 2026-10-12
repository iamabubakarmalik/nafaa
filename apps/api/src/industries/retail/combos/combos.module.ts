import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { CombosController } from './combos.controller';
import { CombosService } from './combos.service';

@Module({
  controllers: [CombosController],
  providers: [CombosService, TenantTimezoneService],
  exports: [CombosService],
})
export class CombosModule {}
