import { Module } from '@nestjs/common';
import { BulkPricingController } from './bulk-pricing.controller';
import { BulkPricingService } from './bulk-pricing.service';

@Module({ controllers: [BulkPricingController], providers: [BulkPricingService], exports: [BulkPricingService] })
export class BulkPricingModule {}
