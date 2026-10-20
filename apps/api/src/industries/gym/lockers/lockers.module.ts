import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { LockersController } from './lockers.controller';
import { LockersService } from './lockers.service';

@Module({ controllers: [LockersController], providers: [LockersService, TenantTimezoneService], exports: [LockersService] })
export class LockersModule {}
