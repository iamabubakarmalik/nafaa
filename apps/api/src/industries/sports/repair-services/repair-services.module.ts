import { Module } from '@nestjs/common';
import { RepairServicesController } from './repair-services.controller';
import { RepairServicesService } from './repair-services.service';

@Module({
  controllers: [RepairServicesController],
  providers: [RepairServicesService],
  exports: [RepairServicesService],
})
export class RepairServicesModule {}
