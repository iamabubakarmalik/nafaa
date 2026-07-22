import { Module } from '@nestjs/common';
import { WeightOrdersController } from './weight-orders.controller';
import { WeightOrdersService } from './weight-orders.service';

@Module({ controllers: [WeightOrdersController], providers: [WeightOrdersService], exports: [WeightOrdersService] })
export class WeightOrdersModule {}
