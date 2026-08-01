import { Module } from '@nestjs/common';
import { ToyProductsController } from './products.controller';
import { ToyProductsService } from './products.service';

@Module({ controllers: [ToyProductsController], providers: [ToyProductsService], exports: [ToyProductsService] })
export class ToyProductsModule {}
