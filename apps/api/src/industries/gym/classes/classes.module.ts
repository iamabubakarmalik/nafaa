import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({ controllers: [ClassesController], providers: [ClassesService, TenantTimezoneService], exports: [ClassesService] })
export class ClassesModule {}
