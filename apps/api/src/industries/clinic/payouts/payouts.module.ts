import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({ controllers: [PayoutsController], providers: [PayoutsService, ExpensesService, TenantTimezoneService] })
export class PayoutsModule {}
