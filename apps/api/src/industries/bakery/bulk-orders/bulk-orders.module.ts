import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { BulkOrdersController } from './bulk-orders.controller';
import { BulkOrdersService } from './bulk-orders.service';

@Module({ controllers: [BulkOrdersController], providers: [BulkOrdersService, TenantTimezoneService], exports: [BulkOrdersService] })
export class BulkOrdersModule {}
