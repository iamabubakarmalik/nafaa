import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { CakeOrdersController } from './cake-orders.controller';
import { CakeOrdersService } from './cake-orders.service';

@Module({ controllers: [CakeOrdersController], providers: [CakeOrdersService, TenantTimezoneService], exports: [CakeOrdersService] })
export class CakeOrdersModule {}
