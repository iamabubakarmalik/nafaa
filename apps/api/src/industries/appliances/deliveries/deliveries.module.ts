import { Module } from '@nestjs/common';
import { ApplianceDeliveriesController } from './deliveries.controller';
import { ApplianceDeliveriesService } from './deliveries.service';

@Module({ controllers: [ApplianceDeliveriesController], providers: [ApplianceDeliveriesService], exports: [ApplianceDeliveriesService] })
export class ApplianceDeliveriesModule {}
