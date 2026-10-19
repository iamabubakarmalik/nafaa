import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { StaffProfilesController } from './staff-profiles.controller';
import { StaffProfilesService } from './staff-profiles.service';

@Module({ controllers: [StaffProfilesController], providers: [StaffProfilesService, TenantTimezoneService], exports: [StaffProfilesService] })
export class StaffProfilesModule {}
