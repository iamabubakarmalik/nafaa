import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { BulkOrdersController } from './bulk-orders.controller';
import { BulkOrdersService } from './bulk-orders.service';

@Module({ imports: [SalesModule], controllers: [BulkOrdersController], providers: [BulkOrdersService], exports: [BulkOrdersService] })
export class BulkOrdersModule {}
