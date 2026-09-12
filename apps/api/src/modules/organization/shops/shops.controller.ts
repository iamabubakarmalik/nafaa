import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopsService } from './shops.service';
import { StockReconcileService } from './stock-reconcile.service';

@ApiTags('Shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly reconcile: StockReconcileService,
  ) {}

  /**
   * Re-derive every product's stock from the per-branch rows.
   * `?dryRun=true` reports what would change without touching anything.
   */
  @Post('reconcile-stock')
  reconcileStock(
    @GetUser() user: AuthenticatedUser,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.reconcile.run(user, dryRun === 'true' || dryRun === '1');
  }

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.shopsService.list(user);
  }

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser) {
    return this.shopsService.overview(user);
  }

  /** Har branch ka muqabla + sab ka mila hua total — "All Shops" view ke liye. */
  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser) {
    return this.shopsService.analytics(user);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.shopsService.update(user, id, dto);
  }

  @Patch(':id/toggle')
  toggleActive(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.toggleActive(user, id);
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    const isForce = force === 'true' || force === '1';
    return this.shopsService.remove(user, id, isForce);
  }
}
