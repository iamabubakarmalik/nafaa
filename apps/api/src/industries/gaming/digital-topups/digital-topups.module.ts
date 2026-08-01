import { Module } from '@nestjs/common';
import { DigitalTopupsController } from './digital-topups.controller';
import { DigitalTopupsService } from './digital-topups.service';

@Module({ controllers: [DigitalTopupsController], providers: [DigitalTopupsService], exports: [DigitalTopupsService] })
export class DigitalTopupsModule {}
