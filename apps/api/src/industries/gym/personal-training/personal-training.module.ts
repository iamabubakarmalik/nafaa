import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PersonalTrainingController } from './personal-training.controller';
import { PersonalTrainingService } from './personal-training.service';
import { PtPackagesController } from './pt-packages.controller';
import { PtPackagesService } from './pt-packages.service';

@Module({
  controllers: [PtPackagesController, PersonalTrainingController],
  providers: [PersonalTrainingService, PtPackagesService, TenantTimezoneService],
  exports: [PersonalTrainingService, PtPackagesService],
})
export class PersonalTrainingModule {}
