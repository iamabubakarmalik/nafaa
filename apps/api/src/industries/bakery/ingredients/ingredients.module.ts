import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

@Module({ controllers: [IngredientsController], providers: [IngredientsService, TenantTimezoneService], exports: [IngredientsService] })
export class IngredientsModule {}
