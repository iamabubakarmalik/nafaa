import { Module } from '@nestjs/common';
import { SportsBrandsModule } from './brands/brands.module';
import { SportsProductsModule } from './products/products.module';
import { TeamOrdersModule } from './team-orders/team-orders.module';
import { RepairServicesModule } from './repair-services/repair-services.module';
import { SportsDashboardModule } from './dashboard/sports-dashboard.module';

@Module({
  imports: [
    SportsBrandsModule,
    SportsProductsModule,
    TeamOrdersModule,
    RepairServicesModule,
    SportsDashboardModule,
  ],
  exports: [
    SportsBrandsModule,
    SportsProductsModule,
    TeamOrdersModule,
    RepairServicesModule,
    SportsDashboardModule,
  ],
})
export class SportsModule {}
