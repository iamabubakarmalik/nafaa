import { Module } from '@nestjs/common';
import { ApplianceBrandsController } from './brands.controller';
import { ApplianceBrandsService } from './brands.service';

@Module({ controllers: [ApplianceBrandsController], providers: [ApplianceBrandsService], exports: [ApplianceBrandsService] })
export class ApplianceBrandsModule {}
