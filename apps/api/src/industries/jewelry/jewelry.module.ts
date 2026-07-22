import { Module } from '@nestjs/common';
import { CustomOrdersModule } from './custom-orders/custom-orders.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { JewelryDashboardModule } from './dashboard/jewelry-dashboard.module';
import { JewelryProductsModule } from './products/jewelry-products.module';
import { KarigarsModule } from './karigars/karigars.module';
import { MetalRatesModule } from './metal-rates/metal-rates.module';
import { MetalStockModule } from './metal-stock/metal-stock.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [
    MetalRatesModule,
    JewelryProductsModule,
    SalesModule,
    CustomOrdersModule,
    ExchangesModule,
    KarigarsModule,
    MetalStockModule,
    JewelryDashboardModule,
  ],
  exports: [
    MetalRatesModule,
    JewelryProductsModule,
    SalesModule,
    CustomOrdersModule,
    ExchangesModule,
    KarigarsModule,
    MetalStockModule,
    JewelryDashboardModule,
  ],
})
export class JewelryModule {}
