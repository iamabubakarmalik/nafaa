import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { HotelDashboardController, HotelReportsController } from './hotel-dashboard.controller';
import { HotelDashboardService } from './hotel-dashboard.service';

@Module({ imports: [RoomsModule], controllers: [HotelDashboardController, HotelReportsController], providers: [HotelDashboardService], exports: [HotelDashboardService] })
export class HotelDashboardModule {}
