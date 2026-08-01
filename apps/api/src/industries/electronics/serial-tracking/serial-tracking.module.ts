import { Module } from '@nestjs/common';
import { SerialTrackingController } from './serial-tracking.controller';
import { SerialTrackingService } from './serial-tracking.service';

@Module({ controllers: [SerialTrackingController], providers: [SerialTrackingService], exports: [SerialTrackingService] })
export class SerialTrackingModule {}
