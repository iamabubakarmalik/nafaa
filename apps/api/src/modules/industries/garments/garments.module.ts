import { Module } from '@nestjs/common';
import { AlterationsModule } from './alterations/alterations.module';
import { CollectionsModule } from './collections/collections.module';
import { GarmentProductsModule } from './products/garment-products.module';
import { GarmentsDashboardModule } from './dashboard/garments-dashboard.module';
import { LayawayModule } from './layaway/layaway.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SizeChartsModule } from './size-charts/size-charts.module';
import { TailoringModule } from './tailoring/tailoring.module';

@Module({
  imports: [
    CollectionsModule,
    SizeChartsModule,
    GarmentProductsModule,
    MeasurementsModule,
    TailoringModule,
    AlterationsModule,
    ReservationsModule,
    LayawayModule,
    GarmentsDashboardModule,
  ],
  exports: [
    CollectionsModule,
    SizeChartsModule,
    GarmentProductsModule,
    MeasurementsModule,
    TailoringModule,
    AlterationsModule,
    ReservationsModule,
    LayawayModule,
    GarmentsDashboardModule,
  ],
})
export class GarmentsModule {}
