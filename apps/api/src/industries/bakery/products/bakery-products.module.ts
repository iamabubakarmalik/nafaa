import { Module } from '@nestjs/common';
import { BakeryProductsController } from './bakery-products.controller';
import { BakeryProductsService } from './bakery-products.service';

@Module({ controllers: [BakeryProductsController], providers: [BakeryProductsService], exports: [BakeryProductsService] })
export class BakeryProductsModule {}
