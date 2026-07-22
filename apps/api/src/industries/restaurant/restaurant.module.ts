import { Module } from '@nestjs/common';
import { DeliveryModule } from './delivery/delivery.module';
import { HappyHoursModule } from './happy-hours/happy-hours.module';
import { KotModule } from './kot/kot.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { OrdersModule } from './orders/orders.module';
import { RecipesModule } from './recipes/recipes.module';
import { RestaurantDashboardModule } from './dashboard/restaurant-dashboard.module';
import { RidersModule } from './riders/riders.module';
import { StationsModule } from './stations/stations.module';
import { TablesV2Module } from './tables/tables-v2.module';

@Module({
  imports: [
    MenuItemsModule,
    ModifiersModule,
    RecipesModule,
    TablesV2Module,
    OrdersModule,
    KotModule,
    RidersModule,
    DeliveryModule,
    StationsModule,
    HappyHoursModule,
    RestaurantDashboardModule,
  ],
  exports: [
    MenuItemsModule,
    ModifiersModule,
    RecipesModule,
    TablesV2Module,
    OrdersModule,
    KotModule,
    RidersModule,
    DeliveryModule,
    StationsModule,
    HappyHoursModule,
    RestaurantDashboardModule,
  ],
})
export class RestaurantModule {}
