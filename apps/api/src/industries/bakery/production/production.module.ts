import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({ controllers: [ProductionController], providers: [ProductionService, TenantTimezoneService], exports: [ProductionService] })
export class ProductionModule {}
