import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { SalonBillsModule } from './bills/salon-bills.module';
import { CustomerProfilesModule } from './customer-profiles/customer-profiles.module';
import { GiftVouchersModule } from './gift-vouchers/gift-vouchers.module';
import { MembershipsModule } from './memberships/memberships.module';
import { PackagesModule } from './packages/packages.module';
import { SalonDashboardModule } from './dashboard/salon-dashboard.module';
import { ServicesModule } from './services/services.module';
import { StaffProfilesModule } from './staff-profiles/staff-profiles.module';

@Module({
  imports: [
    SalonBillsModule,
    ServicesModule,
    StaffProfilesModule,
    AppointmentsModule,
    MembershipsModule,
    PackagesModule,
    CustomerProfilesModule,
    SalonDashboardModule,
    GiftVouchersModule,
  ],
  exports: [
    SalonBillsModule,
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
