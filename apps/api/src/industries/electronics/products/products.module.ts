import { Module } from '@nestjs/common';
import { ElectronicsProductsController } from './products.controller';
import { ElectronicsProductsService } from './products.service';

@Module({ controllers: [ElectronicsProductsController], providers: [ElectronicsProductsService], exports: [ElectronicsProductsService] })
export class ElectronicsProductsModule {}
