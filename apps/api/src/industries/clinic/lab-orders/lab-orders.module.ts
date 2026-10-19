import { Module } from '@nestjs/common';
import { LabOrdersController } from './lab-orders.controller';
import { LabOrdersService } from './lab-orders.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';

@Module({ imports: [SalesModule], controllers: [LabOrdersController], providers: [LabOrdersService], exports: [LabOrdersService] })
export class LabOrdersModule {}
