import { Module } from '@nestjs/common';
import { ImeiModule } from './mobile/imei/imei.module';
import { EmiModule } from './mobile/emi/emi.module';
import { BatchesModule } from './pharmacy/batches/batches.module';
import { TablesModule } from './restaurant/tables/tables.module';
import { AppointmentsModule } from './salon/appointments/appointments.module';
import { CarpetModule } from './carpet/carpet.module';

@Module({
  imports: [
    ImeiModule,
    EmiModule,
    BatchesModule,
    TablesModule,
    AppointmentsModule,
    CarpetModule,
  ],
  exports: [
    ImeiModule,
    EmiModule,
    BatchesModule,
    TablesModule,
    AppointmentsModule,
    CarpetModule,
  ],
})
export class IndustriesModule {}
