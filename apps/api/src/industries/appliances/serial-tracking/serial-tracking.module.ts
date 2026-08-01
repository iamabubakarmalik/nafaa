import { Module } from '@nestjs/common';
import { ApplianceSerialController } from './serial-tracking.controller';
import { ApplianceSerialService } from './serial-tracking.service';

@Module({ controllers: [ApplianceSerialController], providers: [ApplianceSerialService], exports: [ApplianceSerialService] })
export class ApplianceSerialModule {}
