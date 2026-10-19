import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({ controllers: [MembersController], providers: [MembersService, TenantTimezoneService], exports: [MembersService] })
export class MembersModule {}
