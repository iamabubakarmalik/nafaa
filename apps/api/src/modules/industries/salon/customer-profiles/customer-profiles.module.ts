import { Module } from '@nestjs/common';
import { CustomerProfilesController } from './customer-profiles.controller';
import { CustomerProfilesService } from './customer-profiles.service';

@Module({ controllers: [CustomerProfilesController], providers: [CustomerProfilesService], exports: [CustomerProfilesService] })
export class CustomerProfilesModule {}
