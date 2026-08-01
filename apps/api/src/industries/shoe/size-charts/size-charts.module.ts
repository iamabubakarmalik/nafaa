import { Module } from '@nestjs/common';
import { ShoeSizeChartsController } from './size-charts.controller';
import { ShoeSizeChartsService } from './size-charts.service';
@Module({ controllers: [ShoeSizeChartsController], providers: [ShoeSizeChartsService], exports: [ShoeSizeChartsService] })
export class ShoeSizeChartsModule {}
