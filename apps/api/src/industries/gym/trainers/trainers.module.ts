import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({ controllers: [TrainersController], providers: [TrainersService, ExpensesService, TenantTimezoneService], exports: [TrainersService] })
export class TrainersModule {}
