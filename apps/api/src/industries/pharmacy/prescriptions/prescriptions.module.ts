import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { ControlledLogModule } from '../controlled-log/controlled-log.module';

@Module({ imports: [SalesModule, ControlledLogModule], controllers: [PrescriptionsController], providers: [PrescriptionsService], exports: [PrescriptionsService] })
export class PrescriptionsModule {}
