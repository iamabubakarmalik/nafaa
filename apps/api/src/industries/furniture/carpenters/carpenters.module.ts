import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { CarpentersController } from './carpenters.controller';
import { CarpentersService } from './carpenters.service';

@Module({ controllers: [CarpentersController], providers: [CarpentersService, ExpensesService, TenantTimezoneService], exports: [CarpentersService] })
export class CarpentersModule {}
