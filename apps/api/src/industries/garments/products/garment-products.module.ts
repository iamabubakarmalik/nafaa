import { Module } from '@nestjs/common';
import { GarmentProductsController } from './garment-products.controller';
import { GarmentProductsService } from './garment-products.service';

@Module({ controllers: [GarmentProductsController], providers: [GarmentProductsService], exports: [GarmentProductsService] })
export class GarmentProductsModule {}
