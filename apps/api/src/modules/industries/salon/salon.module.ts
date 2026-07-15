import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { CustomerProfilesModule } from './customer-profiles/customer-profiles.module';
import { MembershipsModule } from './memberships/memberships.module';
import { PackagesModule } from './packages/packages.module';
import { SalonDashboardModule } from './dashboard/salon-dashboard.module';
import { ServicesModule } from './services/services.module';
import { StaffProfilesModule } from './staff-profiles/staff-profiles.module';

@Module({
  imports: [
    ServicesModule,
    StaffProfilesModule,
    AppointmentsModule,
    MembershipsModule,
    PackagesModule,
    CustomerProfilesModule,
    SalonDashboardModule,
  ],
  exports: [
    ServicesModule,
    StaffProfilesModule,
    AppointmentsModule,
    MembershipsModule,
    PackagesModule,
    CustomerProfilesModule,
    SalonDashboardModule,
  ],
})
export class SalonModule {}
