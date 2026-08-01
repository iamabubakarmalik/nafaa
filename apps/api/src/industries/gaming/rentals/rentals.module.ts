import { Module } from '@nestjs/common';
import { GamingRentalsController } from './rentals.controller';
import { GamingRentalsService } from './rentals.service';

@Module({ controllers: [GamingRentalsController], providers: [GamingRentalsService], exports: [GamingRentalsService] })
export class GamingRentalsModule {}
