import { Module } from '@nestjs/common';
import { MetalStockController } from './metal-stock.controller';
import { MetalStockService } from './metal-stock.service';

@Module({ controllers: [MetalStockController], providers: [MetalStockService], exports: [MetalStockService] })
export class MetalStockModule {}
