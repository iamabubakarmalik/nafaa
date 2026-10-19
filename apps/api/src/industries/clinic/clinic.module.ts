import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { ClinicDashboardModule } from './dashboard/clinic-dashboard.module';
import { ClinicServicesModule } from './services/services.module';
import { DoctorsModule } from './doctors/doctors.module';
import { EncountersModule } from './encounters/encounters.module';
import { LabOrdersModule } from './lab-orders/lab-orders.module';
import { PanelsModule } from './panels/panels.module';
import { PatientsModule } from './patients/patients.module';
import { PayoutsModule } from './payouts/payouts.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { SpecialtyModule } from './specialty/specialty.module';
import { VaccinationsModule } from './vaccinations/vaccinations.module';
import { VitalsModule } from './vitals/vitals.module';

@Module({
  imports: [
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    VitalsModule,
    EncountersModule,
    PrescriptionsModule,
    LabOrdersModule,
    VaccinationsModule,
    SpecialtyModule,
    ClinicServicesModule,
    ClinicDashboardModule,
    PanelsModule,
    PayoutsModule,
  ],
  exports: [
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    VitalsModule,
    EncountersModule,
    PrescriptionsModule,
    LabOrdersModule,
    VaccinationsModule,
    SpecialtyModule,
    ClinicServicesModule,
    ClinicDashboardModule,
  ],
})
export class ClinicModule {}
