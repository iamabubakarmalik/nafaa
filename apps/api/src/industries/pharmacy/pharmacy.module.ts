import { Module } from '@nestjs/common';
import { ControlledLogModule } from './controlled-log/controlled-log.module';
import { DoctorsModule } from './doctors/doctors.module';
import { DrugInteractionsModule } from './drug-interactions/drug-interactions.module';
import { MedicinesModule } from './medicines/medicines.module';
import { PharmacyDashboardModule } from './dashboard/pharmacy-dashboard.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { RefillRemindersModule } from './refill-reminders/refill-reminders.module';
import { SaltsModule } from './salts/salts.module';
import { SubstitutesModule } from './substitutes/substitutes.module';
import { TemperatureLogModule } from './temperature-log/temperature-log.module';

@Module({
  imports: [
    SaltsModule,
    DrugInteractionsModule,
    MedicinesModule,
    SubstitutesModule,
    DoctorsModule,
    PrescriptionsModule,
    ControlledLogModule,
    RefillRemindersModule,
    TemperatureLogModule,
    PharmacyDashboardModule,
  ],
  exports: [
    SaltsModule,
    DrugInteractionsModule,
    MedicinesModule,
    SubstitutesModule,
    DoctorsModule,
    PrescriptionsModule,
    ControlledLogModule,
    RefillRemindersModule,
    TemperatureLogModule,
    PharmacyDashboardModule,
  ],
})
export class PharmacyModule {}
