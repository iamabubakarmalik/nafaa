import { Module } from '@nestjs/common';
import { ClinicServicesController } from './services.controller';
import { ClinicServicesService } from './services.service';

@Module({ controllers: [ClinicServicesController], providers: [ClinicServicesService], exports: [ClinicServicesService] })
export class ClinicServicesModule {}
