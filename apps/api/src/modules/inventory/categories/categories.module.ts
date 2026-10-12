import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, TenantTimezoneService],
})
export class CategoriesModule {}
