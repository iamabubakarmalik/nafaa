import { Module } from '@nestjs/common';
import { RecipesModule } from '../recipes/recipes.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({ imports: [RecipesModule], controllers: [OrdersController], providers: [OrdersService], exports: [OrdersService] })
export class OrdersModule {}
