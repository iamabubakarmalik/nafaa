import { Module } from '@nestjs/common';
import { LensOrdersController } from './lens-orders.controller';
import { LensOrdersService } from './lens-orders.service';
import { BookingsModule } from '../../../modules/bookings/bookings.module';

@Module({ imports: [BookingsModule], controllers: [LensOrdersController], providers: [LensOrdersService], exports: [LensOrdersService] })
export class LensOrdersModule {}
