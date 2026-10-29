/**
 * Nafaa AI: the in-app business assistant (chat, morning summary, reorder
 * suggestions, confirmed actions). Report and write services that their own
 * modules do not export are provided here directly; none of them runs
 * scheduled jobs, so a second instance has no side effects.
 */

import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { LowStockModule } from '../inventory/low-stock/low-stock.module';
import { ReportsCenterService } from '../reports/reports/reports-center.service';
import { CustomerCreditService } from '../reports/customers-report/customer-credit.service';
import { StaffShiftsService } from '../reports/staff-report/staff-shifts.service';
import { StockAnalysisService } from '../reports/stock-report/stock-analysis.service';
import { LoyaltyModule } from '../customers/loyalty/loyalty.module';
import { SalesModule } from '../sales/sales/sales.module';
import { StockAdjustmentsModule } from '../inventory/stock-adjustments/stock-adjustments.module';
import { SupplierLedgerModule } from '../purchasing/supplier-ledger/supplier-ledger.module';
import { ProductsService } from '../inventory/products/products.service';
import { CustomersService } from '../customers/customers/customers.service';
import { CustomerLedgerService } from '../customers/customer-ledger/customer-ledger.service';
import { ExpensesService } from '../finance/expenses/expenses.service';
import { PurchasesService } from '../purchasing/purchases/purchases.service';
import { ManufacturingModule } from '../manufacturing/manufacturing.module';
import { IncomeModule } from '../finance/income/income.module';
import { DistributionModule } from '../distribution/distribution.module';
import { AiActionsService } from './ai-actions.service';
import { OrderToolsService } from '../../integrations/online-orders/order-tools.service';
import { AiAssistantController } from './ai-assistant.controller';
import { AiChatService } from './ai-chat.service';
import { AiHistoryStore } from './ai-history.store';
import { AiToolsService } from './ai-tools.service';
import { MorningSummaryService } from './morning-summary.service';

@Module({
  imports: [LowStockModule, LoyaltyModule, SalesModule, StockAdjustmentsModule, SupplierLedgerModule, ManufacturingModule, IncomeModule, DistributionModule],
  controllers: [AiAssistantController],
  providers: [
    TenantTimezoneService,
    ReportsCenterService, CustomerCreditService, StaffShiftsService, StockAnalysisService,
    // Write services for confirmed actions (no scheduled jobs in any of them).
    ProductsService, CustomersService, CustomerLedgerService, ExpensesService, PurchasesService, AiActionsService,
    OrderToolsService,
    AiHistoryStore, AiToolsService, AiChatService, MorningSummaryService,
  ],
})
export class NafaaAiModule {}
