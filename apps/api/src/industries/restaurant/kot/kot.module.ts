import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RecipesModule } from '../recipes/recipes.module';
import { KotController } from './kot.controller';
import { KotService } from './kot.service';

@Module({ imports: [RecipesModule], controllers: [KotController], providers: [KotService, TenantTimezoneService], exports: [KotService] })
export class KotModule {}
