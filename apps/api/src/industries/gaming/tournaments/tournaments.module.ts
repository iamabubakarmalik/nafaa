import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({ controllers: [TournamentsController], providers: [TournamentsService, ExpensesService, TenantTimezoneService], exports: [TournamentsService] })
export class TournamentsModule {}
