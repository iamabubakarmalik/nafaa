import { Module } from '@nestjs/common';
import { FloristOrdersController } from './orders.controller';
import { FloristOrdersService } from './orders.service';
@Module({ controllers: [FloristOrdersController], providers: [FloristOrdersService], exports: [FloristOrdersService] })
export class FloristOrdersModule {}
