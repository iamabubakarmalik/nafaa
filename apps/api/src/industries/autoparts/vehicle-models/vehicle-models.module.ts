import { Module } from '@nestjs/common';
import { VehicleModelsController } from './vehicle-models.controller';
import { VehicleModelsService } from './vehicle-models.service';

@Module({ controllers: [VehicleModelsController], providers: [VehicleModelsService], exports: [VehicleModelsService] })
export class VehicleModelsModule {}
