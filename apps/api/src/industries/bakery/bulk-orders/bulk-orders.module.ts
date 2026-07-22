import { Module } from '@nestjs/common';
import { BulkOrdersController } from './bulk-orders.controller';
import { BulkOrdersService } from './bulk-orders.service';

@Module({ controllers: [BulkOrdersController], providers: [BulkOrdersService], exports: [BulkOrdersService] })
export class BulkOrdersModule {}
