import { Module } from '@nestjs/common';
import { DairyDeliveriesController } from './deliveries.controller';
import { DairyDeliveriesService } from './deliveries.service';

@Module({ controllers: [DairyDeliveriesController], providers: [DairyDeliveriesService], exports: [DairyDeliveriesService] })
export class DairyDeliveriesModule {}
