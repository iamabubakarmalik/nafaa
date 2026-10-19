import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { WarrantyClaimsController } from './warranty-claims.controller';
import { WarrantyClaimsService } from './warranty-claims.service';

@Module({ controllers: [WarrantyClaimsController], providers: [WarrantyClaimsService, TenantTimezoneService], exports: [WarrantyClaimsService] })
export class WarrantyClaimsModule {}
