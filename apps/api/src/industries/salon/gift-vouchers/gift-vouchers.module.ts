import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { GiftVouchersController } from './gift-vouchers.controller';
import { GiftVouchersService } from './gift-vouchers.service';

@Module({ controllers: [GiftVouchersController], providers: [GiftVouchersService, TenantTimezoneService] })
export class GiftVouchersModule {}
