import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({ controllers: [EquipmentController], providers: [EquipmentService, ExpensesService, TenantTimezoneService], exports: [EquipmentService] })
export class EquipmentModule {}
