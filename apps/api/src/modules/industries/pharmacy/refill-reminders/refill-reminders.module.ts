import { Module } from '@nestjs/common';
import { RefillRemindersController } from './refill-reminders.controller';
import { RefillRemindersService } from './refill-reminders.service';

@Module({ controllers: [RefillRemindersController], providers: [RefillRemindersService], exports: [RefillRemindersService] })
export class RefillRemindersModule {}
