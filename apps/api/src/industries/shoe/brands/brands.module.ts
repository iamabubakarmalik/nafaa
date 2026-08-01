import { Module } from '@nestjs/common';
import { ShoeBrandsController } from './brands.controller';
import { ShoeBrandsService } from './brands.service';
@Module({ controllers: [ShoeBrandsController], providers: [ShoeBrandsService], exports: [ShoeBrandsService] })
export class ShoeBrandsModule {}
