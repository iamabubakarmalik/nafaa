import { Module } from '@nestjs/common';
import { CustomOrdersController } from './custom-orders.controller';
import { CustomOrdersService } from './custom-orders.service';

@Module({ controllers: [CustomOrdersController], providers: [CustomOrdersService], exports: [CustomOrdersService] })
export class CustomOrdersModule {}
