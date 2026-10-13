import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { FreshnessController } from './freshness.controller';
import { FreshnessService } from './freshness.service';

@Module({ controllers: [FreshnessController], providers: [FreshnessService, TenantTimezoneService], exports: [FreshnessService] })
export class FreshnessModule {}
