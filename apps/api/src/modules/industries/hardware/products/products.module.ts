import { Module } from '@nestjs/common';
import { HardwareProductsController } from './products.controller';
import { HardwareProductsService } from './products.service';

@Module({ controllers: [HardwareProductsController], providers: [HardwareProductsService], exports: [HardwareProductsService] })
export class HardwareProductsModule {}
