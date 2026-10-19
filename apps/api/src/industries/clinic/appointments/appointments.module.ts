import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { PanelsModule } from '../panels/panels.module';

@Module({ imports: [SalesModule, ReturnsModule, PanelsModule], controllers: [AppointmentsController], providers: [AppointmentsService], exports: [AppointmentsService] })
export class AppointmentsModule {}
