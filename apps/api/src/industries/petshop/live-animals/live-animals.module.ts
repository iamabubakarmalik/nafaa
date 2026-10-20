import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { LiveAnimalsController } from './live-animals.controller';
import { LiveAnimalsService } from './live-animals.service';

@Module({ imports: [SalesModule], controllers: [LiveAnimalsController], providers: [LiveAnimalsService, ExpensesService, TenantTimezoneService], exports: [LiveAnimalsService] })
export class LiveAnimalsModule {}
