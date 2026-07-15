import { Module } from '@nestjs/common';
import { CustomerVehiclesModule } from './customer-vehicles/customer-vehicles.module';
import { AutoPartsDashboardModule } from './dashboard/autoparts-dashboard.module';
import { MechanicsModule } from './mechanics/mechanics.module';
import { PartProfilesModule } from './part-profiles/part-profiles.module';
import { ServiceRemindersModule } from './service-reminders/service-reminders.module';
import { VehicleMakesModule } from './vehicle-makes/vehicle-makes.module';
import { VehicleModelsModule } from './vehicle-models/vehicle-models.module';
import { WorkshopJobsModule } from './workshop-jobs/workshop-jobs.module';

@Module({
  imports: [
    VehicleMakesModule,
    VehicleModelsModule,
    CustomerVehiclesModule,
    PartProfilesModule,
    WorkshopJobsModule,
    MechanicsModule,
    ServiceRemindersModule,
    AutoPartsDashboardModule,
  ],
  exports: [
    VehicleMakesModule,
    VehicleModelsModule,
    CustomerVehiclesModule,
    PartProfilesModule,
    WorkshopJobsModule,
    MechanicsModule,
    ServiceRemindersModule,
    AutoPartsDashboardModule,
  ],
})
export class AutoPartsModule {}
