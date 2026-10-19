import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({ imports: [SalesModule], controllers: [ReservationsController], providers: [ReservationsService, TenantTimezoneService], exports: [ReservationsService] })
export class ReservationsModule {}
