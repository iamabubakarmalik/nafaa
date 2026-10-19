import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { KarigarsController } from './karigars.controller';
import { KarigarsService } from './karigars.service';

@Module({ controllers: [KarigarsController], providers: [KarigarsService, ExpensesService, TenantTimezoneService], exports: [KarigarsService] })
export class KarigarsModule {}
