import { Module } from '@nestjs/common';
import { WarrantyClaimsController } from './warranty-claims.controller';
import { WarrantyClaimsService } from './warranty-claims.service';

@Module({ controllers: [WarrantyClaimsController], providers: [WarrantyClaimsService], exports: [WarrantyClaimsService] })
export class WarrantyClaimsModule {}
