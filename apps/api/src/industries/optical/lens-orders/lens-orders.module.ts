import { Module } from '@nestjs/common';
import { LensOrdersController } from './lens-orders.controller';
import { LensOrdersService } from './lens-orders.service';

@Module({ controllers: [LensOrdersController], providers: [LensOrdersService], exports: [LensOrdersService] })
export class LensOrdersModule {}
