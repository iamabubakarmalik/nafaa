import { Module } from '@nestjs/common';
import { FurnitureProductsController } from './products.controller';
import { FurnitureProductsService } from './products.service';

@Module({ controllers: [FurnitureProductsController], providers: [FurnitureProductsService], exports: [FurnitureProductsService] })
export class FurnitureProductsModule {}
