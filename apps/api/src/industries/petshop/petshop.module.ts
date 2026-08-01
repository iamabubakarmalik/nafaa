import { Module } from '@nestjs/common';
import { PetshopDashboardModule } from './dashboard/petshop-dashboard.module';
import { GroomersModule } from './groomers/groomers.module';
import { GroomingModule } from './grooming/grooming.module';
import { LiveAnimalsModule } from './live-animals/live-animals.module';
import { PetProductsModule } from './products/products.module';

@Module({
  imports: [
    PetProductsModule,
    LiveAnimalsModule,
    GroomingModule,
    GroomersModule,
    PetshopDashboardModule,
  ],
  exports: [
    PetProductsModule,
    LiveAnimalsModule,
    GroomingModule,
    GroomersModule,
    PetshopDashboardModule,
  ],
})
export class PetshopModule {}
