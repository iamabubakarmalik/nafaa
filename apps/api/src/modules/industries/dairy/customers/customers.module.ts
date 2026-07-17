import { Module } from '@nestjs/common';
import { DairyCustomersController } from './customers.controller';
import { DairyCustomersService } from './customers.service';

@Module({ controllers: [DairyCustomersController], providers: [DairyCustomersService], exports: [DairyCustomersService] })
export class DairyCustomersModule {}
