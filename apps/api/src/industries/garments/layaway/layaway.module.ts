import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { LayawayController } from './layaway.controller';
import { LayawayService } from './layaway.service';

@Module({ imports: [SalesModule], controllers: [LayawayController], providers: [LayawayService, TenantTimezoneService], exports: [LayawayService] })
export class LayawayModule {}
