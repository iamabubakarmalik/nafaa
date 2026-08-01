import { Module } from '@nestjs/common';
import { ShoeExchangesController } from './exchanges.controller';
import { ShoeExchangesService } from './exchanges.service';
@Module({ controllers: [ShoeExchangesController], providers: [ShoeExchangesService], exports: [ShoeExchangesService] })
export class ShoeExchangesModule {}
