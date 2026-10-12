import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  controllers: [TransfersController],
  providers: [TransfersService, TenantTimezoneService],
})
export class TransfersModule {}
