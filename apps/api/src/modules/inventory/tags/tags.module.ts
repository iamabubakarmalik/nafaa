import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  controllers: [TagsController],
  providers: [TagsService, TenantTimezoneService],
})
export class TagsModule {}
