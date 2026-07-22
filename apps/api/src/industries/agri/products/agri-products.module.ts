import { Module } from '@nestjs/common';
import { AgriProductsController } from './agri-products.controller';
import { AgriProductsService } from './agri-products.service';

@Module({ controllers: [AgriProductsController], providers: [AgriProductsService], exports: [AgriProductsService] })
export class AgriProductsModule {}
