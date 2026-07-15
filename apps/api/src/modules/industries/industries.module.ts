import { Module } from '@nestjs/common';
import { CarpetModule } from './carpet/carpet.module';
import { RetailModule } from './retail/retail.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { MobileModule } from './mobile/mobile.module';
import { GarmentsModule } from './garments/garments.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { AutoPartsModule } from './autoparts/autoparts.module';
import { SalonModule } from './salon/salon.module';


@Module({
  imports: [
    RetailModule,
    RestaurantModule,
    CarpetModule,
    MobileModule,
    GarmentsModule,
    PharmacyModule,
    AutoPartsModule,
    SalonModule,
  ],
  exports: [
    RetailModule,
    RestaurantModule,
    CarpetModule,
    MobileModule,
    GarmentsModule,
    PharmacyModule,
    AutoPartsModule,
    SalonModule,
  ],
})
export class IndustriesModule {}
