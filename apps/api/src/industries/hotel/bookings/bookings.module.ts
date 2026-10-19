import { Module } from '@nestjs/common';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { HotelBillVoidService } from './hotel-bill-void.service';

@Module({ imports: [SalesModule, ReturnsModule], controllers: [BookingsController], providers: [BookingsService, HotelBillVoidService], exports: [BookingsService] })
export class BookingsModule {}
