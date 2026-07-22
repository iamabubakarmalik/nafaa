import { Module } from '@nestjs/common';
import { JewelryProductsController } from './jewelry-products.controller';
import { JewelryProductsService } from './jewelry-products.service';

@Module({ controllers: [JewelryProductsController], providers: [JewelryProductsService], exports: [JewelryProductsService] })
export class JewelryProductsModule {}
