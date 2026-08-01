import { Module } from '@nestjs/common';
import { ShoeProductsController } from './products.controller';
import { ShoeProductsService } from './products.service';
@Module({ controllers: [ShoeProductsController], providers: [ShoeProductsService], exports: [ShoeProductsService] })
export class ShoeProductsModule {}
