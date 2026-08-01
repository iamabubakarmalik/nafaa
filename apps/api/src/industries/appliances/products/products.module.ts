import { Module } from '@nestjs/common';
import { ApplianceProductsController } from './products.controller';
import { ApplianceProductsService } from './products.service';

@Module({ controllers: [ApplianceProductsController], providers: [ApplianceProductsService], exports: [ApplianceProductsService] })
export class ApplianceProductsModule {}
