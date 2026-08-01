import { Module } from '@nestjs/common';
import { FloristProductsController } from './products.controller';
import { FloristProductsService } from './products.service';
@Module({ controllers: [FloristProductsController], providers: [FloristProductsService], exports: [FloristProductsService] })
export class FloristProductsModule {}
