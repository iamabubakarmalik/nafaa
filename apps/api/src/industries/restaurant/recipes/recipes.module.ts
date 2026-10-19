import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({ controllers: [RecipesController], providers: [RecipesService, TenantTimezoneService], exports: [RecipesService] })
export class RecipesModule {}
