import { Module } from '@nestjs/common';
import { CustomerVehiclesController } from './customer-vehicles.controller';
import { CustomerVehiclesService } from './customer-vehicles.service';

@Module({ controllers: [CustomerVehiclesController], providers: [CustomerVehiclesService], exports: [CustomerVehiclesService] })
export class CustomerVehiclesModule {}
