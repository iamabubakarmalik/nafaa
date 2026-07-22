import { Module } from '@nestjs/common';
import { AttendanceModule } from './attendance/attendance.module';
import { ClassesModule } from './classes/classes.module';
import { DietPlansModule } from './diet-plans/diet-plans.module';
import { EquipmentModule } from './equipment/equipment.module';
import { GymDashboardModule } from './dashboard/gym-dashboard.module';
import { MembersModule } from './members/members.module';
import { MembershipPlansModule } from './membership-plans/membership-plans.module';
import { MembershipsModule } from './memberships/memberships.module';
import { GymMeasurementsModule } from './measurements/measurements.module';
import { PersonalTrainingModule } from './personal-training/personal-training.module';
import { TrainersModule } from './trainers/trainers.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [
    MembersModule,
    MembershipPlansModule,
    MembershipsModule,
    TrainersModule,
    ClassesModule,
    PersonalTrainingModule,
    AttendanceModule,
    GymMeasurementsModule,
    WorkoutsModule,
    EquipmentModule,
    DietPlansModule,
    GymDashboardModule,
  ],
  exports: [
    MembersModule,
    MembershipPlansModule,
    MembershipsModule,
    TrainersModule,
    ClassesModule,
    PersonalTrainingModule,
    AttendanceModule,
    GymMeasurementsModule,
    WorkoutsModule,
    EquipmentModule,
    DietPlansModule,
    GymDashboardModule,
  ],
})
export class GymModule {}