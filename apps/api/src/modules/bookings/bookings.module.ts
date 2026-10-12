import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController],
  providers: [BookingsService, TenantTimezoneService],
  exports: [BookingsService],
})
export class BookingsModule {}
