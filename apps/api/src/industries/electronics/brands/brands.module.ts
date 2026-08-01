import { Module } from '@nestjs/common';
import { ElectronicsBrandsController } from './brands.controller';
import { ElectronicsBrandsService } from './brands.service';

@Module({ controllers: [ElectronicsBrandsController], providers: [ElectronicsBrandsService], exports: [ElectronicsBrandsService] })
export class ElectronicsBrandsModule {}
