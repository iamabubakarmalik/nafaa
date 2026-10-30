/**
 * HTTP routes of the distribution module, under /api/distribution.
 *
 * Permissions come from common/constants/permission-routes.ts (the
 * `distribution/...` rules); routes that need more than one right carry
 * @RequirePermissions. Every route except settings and presets also needs
 * distribution switched on and the plan to allow it (DistributionEnabledGuard).
 * The full contract is in API.md next to this file.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { DistributionEnabledGuard } from './distribution-access';
import {
  AssignCustomersDto, DeletePriceListItemsDto, ImportPriceListDto, SavePriceListDto, SaveRouteDto, SaveSchemeDto,
  SchemePreviewDto, UpdateDistributionSettingsDto, UpdatePriceListDto, UpdateRouteDto, UpdateSchemeDto, UpsertPriceListItemsDto,
} from './dto/setup.dto';
import {
  BootstrapQueryDto, CancelOrdersDto, CollectionIdsDto, CreateCollectionDto, CreateLoadSheetDto, CreateOrderDto, CreateVisitDto,
  DayQueryDto, ListCollectionsDto, ListLoadSheetsDto, ListOrdersDto, ListVisitsDto, LoadSheetOrdersDto, OrderIdsDto,
  PreviewOrderDto, RangeQueryDto, RecoveriesQueryDto, SettleLoadSheetDto, SyncDto, UpdateLoadSheetDto, UpdateOrderDto, DeliverySyncDto,
} from './dto/field.dto';
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
import { VisitAnalyticsQueryDto } from './dto/phase2.dto';

const ids = (v?: string) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500);

@ApiTags('Distribution')
@ApiBearerAuth()
@Controller('distribution')
export class DistributionSettingsController {
  constructor(private readonly service: DistributionSettingsService) {}

  @Get('settings')
  get(@GetUser() user: AuthenticatedUser) {
    return this.service.get(user);
  }

  @Put('settings')
  update(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateDistributionSettingsDto) {
    return this.service.update(user, dto);
  }

  /** Permission presets for the Team page (Order Booker, Delivery, Distribution Manager). */
  @Get('presets')
  presets() {
    return this.service.presets();
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution')
export class DistributionReportsController {
  constructor(private readonly reports: DistributionReportsService) {}

  @Get('dashboard')
  dashboard(@GetUser() user: AuthenticatedUser) {
    return this.reports.dashboard(user);
  }

  @Get('reports/dsr')
  @RequirePermissions(PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.REPORTS_VIEW)
  dsr(@GetUser() user: AuthenticatedUser, @Query() q: DayQueryDto) {
    return this.reports.dsr(user, q);
  }

  /** Visit analytics per booker per day: strike rate, time in market, distance, GPS flags. */
  @Get('reports/visits')
  @RequirePermissions(PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.REPORTS_VIEW)
  visits(@GetUser() user: AuthenticatedUser, @Query() q: VisitAnalyticsQueryDto) {
    return this.reports.visits(user, q);
  }

  @Get('reports/summary')
  @RequirePermissions(PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.REPORTS_VIEW)
  summary(@GetUser() user: AuthenticatedUser, @Query() q: RangeQueryDto) {
    return this.reports.summary(user, q);
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/price-lists')
export class PriceListsController {
  constructor(private readonly service: PriceListsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  /** What a customer (or list) pays for these products, every pack, plus applicable schemes. POS uses this. */
  @Get('resolve')
  resolve(@GetUser() user: AuthenticatedUser, @Query('customerId') customerId?: string, @Query('priceListId') priceListId?: string, @Query('productIds') productIds?: string) {
    return this.service.resolve(user, { customerId, priceListId, productIds });
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: SavePriceListDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Get(':id/items')
  items(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.items(user, id, { search, page: Number(page) || 1, limit: Number(limit) || 100 });
  }

  @Get(':id/grid')
  grid(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('search') search?: string, @Query('categoryId') categoryId?: string, @Query('brandId') brandId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.grid(user, id, { search, categoryId, brandId, page: Number(page) || 1, limit: Number(limit) || 50 });
  }

  @Put(':id/items')
  upsertItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertPriceListItemsDto) {
    return this.service.upsertItems(user, id, dto.items);
  }

  @Post(':id/items/remove')
  removeItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DeletePriceListItemsDto) {
    return this.service.deleteItems(user, id, dto.ids);
  }

  @Post(':id/import')
  importRows(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ImportPriceListDto) {
    return this.service.importRows(user, id, dto);
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/routes')
export class RoutesController {
  constructor(private readonly service: RoutesService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('bookerId') bookerId?: string, @Query('active') active?: string) {
    return this.service.list(user, { bookerId, active });
  }

  /** Routes due on a business day with progress (customers, visited, orders). */
  @Get('day')
  day(@GetUser() user: AuthenticatedUser, @Query() q: DayQueryDto) {
    return this.service.day(user, q);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: SaveRouteDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post(':id/customers')
  assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignCustomersDto) {
    return this.service.assignCustomers(user, id, dto);
  }

  @Delete(':id/customers/:customerId')
  unassign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('customerId') customerId: string) {
    return this.service.removeCustomer(user, id, customerId);
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/schemes')
export class SchemesController {
  constructor(private readonly service: SchemesService, private readonly lists: PriceListsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.service.list(user, { status });
  }

  /** Which scheme each cart line gets (POS and order screens); nothing is saved. */
  @Post('preview')
  preview(@GetUser() user: AuthenticatedUser, @Body() dto: SchemePreviewDto) {
    return this.lists.previewSchemes(user, dto);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: SaveSchemeDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSchemeDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly invoicing: InvoicingService,
    private readonly print: DistributionPrintService,
  ) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListOrdersDto) {
    return this.orders.list(user, q);
  }

  /** A4 invoice data (print kind invoice-a4) for invoiced orders: ?ids=a,b,c; &tax=1 gives the sales tax invoice. */
  @Get('print')
  printInvoices(@GetUser() user: AuthenticatedUser, @Query('ids') list?: string, @Query('tax') tax?: string) {
    return this.print.invoices(user, ids(list), { tax: tax === '1' || tax === 'true' });
  }

  /** Overbooking check: what these orders need from each godown against free stock: ?ids=a,b,c */
  @Get('stock-check')
  stockCheck(@GetUser() user: AuthenticatedUser, @Query('ids') list?: string) {
    return this.orders.stockCheck(user, ids(list));
  }

  @Post('preview')
  preview(@GetUser() user: AuthenticatedUser, @Body() dto: PreviewOrderDto) {
    return this.orders.preview(user, dto);
  }

  /** Approve booked orders and make their invoices. */
  @Post('approve')
  approve(@GetUser() user: AuthenticatedUser, @Body() dto: OrderIdsDto) {
    return this.invoicing.approve(user, dto);
  }

  /** Retry invoices for approved orders (stock was short, PIN was needed). */
  @Post('invoice')
  invoice(@GetUser() user: AuthenticatedUser, @Body() dto: OrderIdsDto) {
    return this.invoicing.invoice(user, dto);
  }

  @Post('cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Body() dto: CancelOrdersDto) {
    return this.orders.cancel(user, dto);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orders.detail(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(user, id, dto);
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/load-sheets')
export class LoadSheetsController {
  constructor(
    private readonly sheets: LoadSheetsService,
    private readonly settlement: SettlementService,
    private readonly print: DistributionPrintService,
  ) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListLoadSheetsDto) {
    return this.sheets.list(user, q);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateLoadSheetDto) {
    return this.sheets.create(user, dto);
  }

  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sheets.get(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLoadSheetDto) {
    return this.sheets.update(user, id, dto);
  }

  /** Print kind load-sheet; ?invoices=0 leaves out the invoices. */
  @Get(':id/print')
  printSheet(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('invoices') invoices?: string) {
    return this.print.loadSheet(user, id, invoices !== '0' && invoices !== 'false');
  }

  @Post(':id/orders')
  addOrders(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LoadSheetOrdersDto) {
    return this.sheets.addOrders(user, id, dto.orderIds);
  }

  @Delete(':id/orders/:orderId')
  removeOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('orderId') orderId: string) {
    return this.sheets.removeOrder(user, id, orderId);
  }

  @Post(':id/dispatch')
  dispatch(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sheets.dispatch(user, id);
  }

  @Post(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sheets.cancel(user, id);
  }

  @Get(':id/settlement')
  settlementPreview(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.settlement.preview(user, id);
  }

  @Post(':id/settle')
  settle(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SettleLoadSheetDto) {
    return this.settlement.settle(user, id, dto);
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListCollectionsDto) {
    return this.service.list(user, q);
  }

  @Get('recoveries')
  recoveries(@GetUser() user: AuthenticatedUser, @Query() q: RecoveriesQueryDto) {
    return this.service.recoveries(user, q);
  }

  /** Print kind recovery-sheet: ?routeId=&date= */
  @Get('recovery-sheet')
  recoverySheet(@GetUser() user: AuthenticatedUser, @Query('routeId') routeId?: string, @Query('date') date?: string) {
    return this.service.recoverySheet(user, { routeId, date });
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCollectionDto) {
    return this.service.create(user, dto);
  }

  @Post('verify')
  verify(@GetUser() user: AuthenticatedUser, @Body() dto: CollectionIdsDto) {
    return this.service.verify(user, dto.ids);
  }

  @Post('reject')
  reject(@GetUser() user: AuthenticatedUser, @Body() dto: CollectionIdsDto) {
    return this.service.reject(user, dto.ids, dto.reason);
  }
}

@ApiTags('Distribution')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/visits')
export class VisitsController {
  constructor(private readonly service: VisitsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListVisitsDto) {
    return this.service.list(user, q);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateVisitDto) {
    return this.service.create(user, dto);
  }
}

/** The booker app. Everything here is limited to the caller's own routes and records. */
@ApiTags('Distribution — booker app')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/booker')
export class BookerController {
  constructor(
    private readonly booker: BookerService,
    private readonly orders: OrdersService,
    private readonly visits: VisitsService,
    private readonly collections: CollectionsService,
  ) {}

  @Get('bootstrap')
  bootstrap(@GetUser() user: AuthenticatedUser, @Query() q: BootstrapQueryDto) {
    return this.booker.bootstrap(user, q);
  }

  @Post('sync')
  sync(@GetUser() user: AuthenticatedUser, @Body() dto: SyncDto) {
    return this.booker.sync(user, dto);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @Query('date') date?: string) {
    return this.booker.summary(user, { date });
  }

  @Get('orders')
  myOrders(@GetUser() user: AuthenticatedUser, @Query() q: ListOrdersDto) {
    return this.orders.list(user, q, user.id);
  }

  @Get('orders/:id')
  myOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orders.detail(user, id, user.id);
  }

  /** Online booking from the app (same as a one-order sync, but errors come back as HTTP errors). */
  @Post('orders')
  book(@GetUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  /** Change an own order while it is still BOOKED. */
  @Patch('orders/:id')
  editOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(user, id, dto);
  }

  /** Price a cart for a customer (online), same result as the app's own offline pricing. */
  @Post('orders/preview')
  previewOrder(@GetUser() user: AuthenticatedUser, @Body() dto: PreviewOrderDto) {
    return this.orders.preview(user, dto);
  }

  @Get('visits')
  myVisits(@GetUser() user: AuthenticatedUser, @Query() q: ListVisitsDto) {
    return this.visits.list(user, q, user.id);
  }

  @Get('collections')
  myCollections(@GetUser() user: AuthenticatedUser, @Query() q: ListCollectionsDto) {
    return this.collections.list(user, q, true);
  }
}

/**
 * The delivery app. Reports are recorded for the office to check at
 * settlement; nothing here posts money or stock. `staff` serves the office's
 * "Delivery wala" pickers.
 */
@ApiTags('Distribution — delivery app')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/delivery')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get('today')
  today(@GetUser() user: AuthenticatedUser) {
    return this.delivery.today(user);
  }

  @Post('sync')
  sync(@GetUser() user: AuthenticatedUser, @Body() dto: DeliverySyncDto) {
    return this.delivery.sync(user, dto);
  }

  @Get('staff')
  staff(@GetUser() user: AuthenticatedUser) {
    return this.delivery.staff(user);
  }
}
