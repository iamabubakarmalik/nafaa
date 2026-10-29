/**
 * Wholesale and distribution: price lists, routes, trade schemes, sales
 * orders booked in the field, invoicing through SalesService, load sheets,
 * settlement through ReturnsService, field collections, visits, the booker
 * app's bootstrap and sync, and reports. Any business can switch it on
 * (DistributionSettings.enabled) when its plan carries featureDistribution.
 */

import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { SalesModule } from '../sales/sales/sales.module';
import { ReturnsModule } from '../sales/returns/returns.module';
import { DistributionAccessService, DistributionEnabledGuard } from './distribution-access';
import {
  BookerController, CollectionsController, DeliveryController, DistributionReportsController, DistributionSettingsController, LoadSheetsController,
  OrdersController, PriceListsController, RoutesController, SchemesController, VisitsController,
} from './distribution.controllers';
import { DistributionAdminController } from './distribution-admin.controller';
import { DistributionSettingsService } from './services/settings.service';
import { PriceListsService } from './services/price-lists.service';
import { RoutesService } from './services/routes.service';
import { SchemesService } from './services/schemes.service';
import { OrdersService } from './services/orders.service';
import { InvoicingService } from './services/invoicing.service';
import { LoadSheetsService } from './services/load-sheets.service';
import { SettlementService } from './services/settlement.service';
import { CollectionsService } from './services/collections.service';
import { VisitsService } from './services/visits.service';
import { BookerService } from './services/booker.service';
import { DeliveryService } from './services/delivery.service';
import { DistributionReportsService } from './services/reports.service';
import { DistributionPrintService } from './services/print.service';

@Module({
  imports: [SalesModule, ReturnsModule],
  controllers: [
    DistributionSettingsController, DistributionReportsController, PriceListsController, RoutesController, SchemesController,
    OrdersController, LoadSheetsController, CollectionsController, VisitsController, BookerController, DeliveryController, DistributionAdminController,
  ],
  providers: [
    TenantTimezoneService, DistributionAccessService, DistributionEnabledGuard,
    DistributionSettingsService, PriceListsService, RoutesService, SchemesService, OrdersService, InvoicingService,
    LoadSheetsService, SettlementService, CollectionsService, VisitsService, BookerService, DistributionReportsService,
    DistributionPrintService, DeliveryService,
  ],
  exports: [DistributionReportsService, CollectionsService, DistributionAccessService],
})
export class DistributionModule {}
