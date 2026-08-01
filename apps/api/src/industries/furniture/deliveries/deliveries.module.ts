import { Module } from '@nestjs/common';
import { FurnitureDeliveriesController } from './deliveries.controller';
import { FurnitureDeliveriesService } from './deliveries.service';

@Module({ controllers: [FurnitureDeliveriesController], providers: [FurnitureDeliveriesService], exports: [FurnitureDeliveriesService] })
export class FurnitureDeliveriesModule {}
