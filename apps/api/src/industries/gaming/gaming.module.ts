import { Module } from '@nestjs/common';
import { CafeSessionsModule } from './cafe-sessions/cafe-sessions.module';
import { DigitalTopupsModule } from './digital-topups/digital-topups.module';
import { GamingDashboardModule } from './dashboard/gaming-dashboard.module';
import { GamingProductsModule } from './products/products.module';
import { GamingRentalsModule } from './rentals/rentals.module';
import { GamingStationsModule } from './stations/stations.module';
import { TournamentsModule } from './tournaments/tournaments.module';

@Module({
  imports: [
    GamingProductsModule,
    GamingRentalsModule,
    DigitalTopupsModule,
    GamingStationsModule,
    CafeSessionsModule,
    TournamentsModule,
    GamingDashboardModule,
  ],
  exports: [
    GamingProductsModule,
    GamingRentalsModule,
    DigitalTopupsModule,
    GamingStationsModule,
    CafeSessionsModule,
    TournamentsModule,
    GamingDashboardModule,
  ],
})
export class GamingModule {}
