import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PersonalTrainingController } from './personal-training.controller';
import { PersonalTrainingService } from './personal-training.service';

@Module({ controllers: [PersonalTrainingController], providers: [PersonalTrainingService, TenantTimezoneService], exports: [PersonalTrainingService] })
export class PersonalTrainingModule {}
