import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  controllers: [PeopleController],
  providers: [PeopleService, TenantTimezoneService],
})
export class PeopleModule {}
