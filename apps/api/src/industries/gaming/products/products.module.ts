import { Module } from '@nestjs/common';
import { GamingProductsController } from './products.controller';
import { GamingProductsService } from './products.service';

@Module({ controllers: [GamingProductsController], providers: [GamingProductsService], exports: [GamingProductsService] })
export class GamingProductsModule {}
