import { Module } from '@nestjs/common';
import { MetalRatesController } from './metal-rates.controller';
import { MetalRatesService } from './metal-rates.service';

@Module({ controllers: [MetalRatesController], providers: [MetalRatesService], exports: [MetalRatesService] })
export class MetalRatesModule {}
