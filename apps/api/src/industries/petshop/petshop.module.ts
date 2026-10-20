import { Module } from '@nestjs/common';
import { PetshopDashboardModule } from './dashboard/petshop-dashboard.module';
import { GroomersModule } from './groomers/groomers.module';
import { GroomingModule } from './grooming/grooming.module';
import { LiveAnimalsModule } from './live-animals/live-animals.module';
import { PetProductsModule } from './products/products.module';
import { SalesModule } from '../../modules/sales/sales/sales.module';
import { ReturnsModule } from '../../modules/sales/returns/returns.module';
import { PetshopBillVoidService } from './petshop-bill-void.service';

@Module({
  imports: [
    PetProductsModule,
    LiveAnimalsModule,
    GroomingModule,
    GroomersModule,
    PetshopDashboardModule,
    SalesModule,
    ReturnsModule,
  ],
  providers: [PetshopBillVoidService],
  exports: [
    PetProductsModule,
    LiveAnimalsModule,
    GroomingModule,
    GroomersModule,
    PetshopDashboardModule,
  ],
})
export class PetshopModule {}

