import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module';
import { FolioModule } from './folio/folio.module';
import { GuestsModule } from './guests/guests.module';
import { HotelDashboardModule } from './dashboard/hotel-dashboard.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { RatePlansModule } from './rate-plans/rate-plans.module';
import { RoomsModule } from './rooms/rooms.module';
import { RoomTypesModule } from './room-types/room-types.module';

@Module({
  imports: [
    RoomTypesModule,
    RoomsModule,
    GuestsModule,
    BookingsModule,
    FolioModule,
    HousekeepingModule,
    RatePlansModule,
    HotelDashboardModule,
  ],
  exports: [
    RoomTypesModule,
    RoomsModule,
    GuestsModule,
    BookingsModule,
    FolioModule,
    HousekeepingModule,
    RatePlansModule,
    HotelDashboardModule,
  ],
})
export class HotelModule {}
