import { Module } from '@nestjs/common';
import { DairyProductsController } from './products.controller';
import { DairyProductsService } from './products.service';

@Module({ controllers: [DairyProductsController], providers: [DairyProductsService], exports: [DairyProductsService] })
export class DairyProductsModule {}
