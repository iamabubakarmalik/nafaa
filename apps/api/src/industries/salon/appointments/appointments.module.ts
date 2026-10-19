import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SalonBillsModule } from '../bills/salon-bills.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [SalonBillsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, TenantTimezoneService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
