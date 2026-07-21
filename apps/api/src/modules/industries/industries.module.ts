import { Module } from '@nestjs/common';
import { CarpetModule } from './carpet/carpet.module';
import { RetailModule } from './retail/retail.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { MobileModule } from './mobile/mobile.module';
import { GarmentsModule } from './garments/garments.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { AutoPartsModule } from './autoparts/autoparts.module';
import { SalonModule } from './salon/salon.module';
import { MeatModule } from './meat/meat.module';
import { BookstoreModule } from './bookstore/bookstore.module';
import { AgriModule } from './agri/agri.module';
import { HardwareModule } from './hardware/hardware.module';
import { DairyModule } from './dairy/dairy.module';
import { JewelryModule } from './jewelry/jewelry.module';
import { GymModule } from './gym/gym.module';
import { BakeryModule } from './bakery/bakery.module';
import { ClinicModule } from './clinic/clinic.module';
import { ServicesBizModule } from './services-biz/services-biz.module';


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
    MeatModule,
    BookstoreModule,
    AgriModule,
    JewelryModule,
    HardwareModule,
    DairyModule,
    GymModule,
    ClinicModule,
    BakeryModule,
    ServicesBizModule,
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
    MeatModule,
    BookstoreModule,
    AgriModule,
    JewelryModule,
    HardwareModule,
    DairyModule,
    GymModule,
    ClinicModule,
    BakeryModule,
    ServicesBizModule,
  ],
})
export class IndustriesModule {}
