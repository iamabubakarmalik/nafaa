/**
 * Trade network: businesses on Nafaa linked as buyer and seller. A buyer
 * orders from a linked seller's catalog; the order lands in the seller's
 * distribution Orders desk; delivery becomes a draft purchase in the buyer's
 * books; payments post on both sides once confirmed. Selling needs
 * distribution on; buying does not.
 */

import { Module } from '@nestjs/common';
import { DistributionModule } from '../distribution/distribution.module';
import { PurchasesModule } from '../purchasing/purchases/purchases.module';
import { SupplierLedgerModule } from '../purchasing/supplier-ledger/supplier-ledger.module';
import { TradeNetworkController } from './trade-network.controller';
import { TradeLinksService } from './services/links.service';
import { TradeCatalogService } from './services/catalog.service';
import { TradeOrdersService } from './services/orders.service';
import { TradePaymentsService } from './services/payments.service';
import { TradeSyncService } from './services/sync.service';

@Module({
  imports: [DistributionModule, PurchasesModule, SupplierLedgerModule],
  controllers: [TradeNetworkController],
  providers: [TradeLinksService, TradeCatalogService, TradeOrdersService, TradePaymentsService, TradeSyncService],
})
export class TradeNetworkModule {}
