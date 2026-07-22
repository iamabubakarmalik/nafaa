import { Module } from '@nestjs/common';
import { MeatProductsController } from './meat-products.controller';
import { MeatProductsService } from './meat-products.service';

@Module({ controllers: [MeatProductsController], providers: [MeatProductsService], exports: [MeatProductsService] })
export class MeatProductsModule {}
