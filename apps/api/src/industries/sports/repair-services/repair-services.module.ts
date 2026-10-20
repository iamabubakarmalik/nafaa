import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { RepairServicesController } from './repair-services.controller';
import { RepairServicesService } from './repair-services.service';

@Module({
  imports: [SalesModule],
  controllers: [RepairServicesController],
  providers: [RepairServicesService],
  exports: [RepairServicesService],
})
export class RepairServicesModule {}
