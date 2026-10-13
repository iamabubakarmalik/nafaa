import { Module } from '@nestjs/common';
import { RecipesModule } from '../recipes/recipes.module';
import { KotController } from './kot.controller';
import { KotService } from './kot.service';

@Module({ imports: [RecipesModule], controllers: [KotController], providers: [KotService], exports: [KotService] })
export class KotModule {}
