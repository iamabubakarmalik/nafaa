import { Module } from '@nestjs/common';
import { CakeOrdersController } from './cake-orders.controller';
import { CakeOrdersService } from './cake-orders.service';

@Module({ controllers: [CakeOrdersController], providers: [CakeOrdersService], exports: [CakeOrdersService] })
export class CakeOrdersModule {}
