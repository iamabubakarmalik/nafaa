import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RoomsModule } from '../rooms/rooms.module';
import { HotelDashboardController, HotelReportsController } from './hotel-dashboard.controller';
import { HotelDashboardService } from './hotel-dashboard.service';

@Module({ imports: [RoomsModule], controllers: [HotelDashboardController, HotelReportsController], providers: [HotelDashboardService, TenantTimezoneService], exports: [HotelDashboardService] })
export class HotelDashboardModule {}
