import { Module } from '@nestjs/common';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { EyeTestsModule } from '../eye-tests/eye-tests.module';
import { LensOrdersModule } from '../lens-orders/lens-orders.module';
import { OpticalBillVoidService } from './optical-bill-void.service';

/** Settles optical records when their bills are voided or returned. */
@Module({ imports: [SalesModule, ReturnsModule, LensOrdersModule, EyeTestsModule], providers: [OpticalBillVoidService] })
export class OpticalBillingModule {}
