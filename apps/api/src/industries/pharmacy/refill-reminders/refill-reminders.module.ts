import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RefillRemindersController } from './refill-reminders.controller';
import { RefillRemindersService } from './refill-reminders.service';

@Module({ controllers: [RefillRemindersController], providers: [RefillRemindersService, TenantTimezoneService], exports: [RefillRemindersService] })
export class RefillRemindersModule {}
