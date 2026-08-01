import { Module } from '@nestjs/common';
import { PetshopDashboardController } from './petshop-dashboard.controller';
import { PetshopDashboardService } from './petshop-dashboard.service';

@Module({ controllers: [PetshopDashboardController], providers: [PetshopDashboardService], exports: [PetshopDashboardService] })
export class PetshopDashboardModule {}
