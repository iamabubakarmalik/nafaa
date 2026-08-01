import { Module } from '@nestjs/common';
import { OpticalProductsController } from './products.controller';
import { OpticalProductsService } from './products.service';

@Module({ controllers: [OpticalProductsController], providers: [OpticalProductsService], exports: [OpticalProductsService] })
export class OpticalProductsModule {}
