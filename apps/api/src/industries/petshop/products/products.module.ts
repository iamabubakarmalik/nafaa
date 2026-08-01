import { Module } from '@nestjs/common';
import { PetProductsController } from './products.controller';
import { PetProductsService } from './products.service';

@Module({ controllers: [PetProductsController], providers: [PetProductsService], exports: [PetProductsService] })
export class PetProductsModule {}
