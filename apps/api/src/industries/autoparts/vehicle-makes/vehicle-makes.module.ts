import { Module } from '@nestjs/common';
import { VehicleMakesController } from './vehicle-makes.controller';
import { VehicleMakesService } from './vehicle-makes.service';

@Module({ controllers: [VehicleMakesController], providers: [VehicleMakesService], exports: [VehicleMakesService] })
export class VehicleMakesModule {}
