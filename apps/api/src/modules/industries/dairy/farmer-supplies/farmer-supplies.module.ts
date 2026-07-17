import { Module } from '@nestjs/common';
import { FarmerSuppliesController } from './farmer-supplies.controller';
import { FarmerSuppliesService } from './farmer-supplies.service';

@Module({ controllers: [FarmerSuppliesController], providers: [FarmerSuppliesService], exports: [FarmerSuppliesService] })
export class FarmerSuppliesModule {}
