import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AlterationsController } from './alterations.controller';
import { AlterationsService } from './alterations.service';

@Module({ controllers: [AlterationsController], providers: [AlterationsService, TenantTimezoneService], exports: [AlterationsService] })
export class AlterationsModule {}
