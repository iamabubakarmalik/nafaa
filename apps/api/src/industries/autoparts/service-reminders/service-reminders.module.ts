import { Module } from '@nestjs/common';
import { ServiceRemindersController } from './service-reminders.controller';
import { ServiceRemindersService } from './service-reminders.service';

@Module({ controllers: [ServiceRemindersController], providers: [ServiceRemindersService], exports: [ServiceRemindersService] })
export class ServiceRemindersModule {}
