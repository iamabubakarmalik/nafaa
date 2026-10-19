import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { FarmerSuppliesService } from './farmer-supplies.service';
import { CreateSupplyDto, SupplyCancelDto, SupplyPayDto } from './dto/create-supply.dto';

/** Milk collections are purchases; paying a slip is paying a supplier. */
@ApiTags('Dairy - Farmer Supplies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/farmer-supplies')
export class FarmerSuppliesController {
  constructor(private readonly service: FarmerSuppliesService) {}

  @Post() @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: CreateSupplyDto) { return this.service.create(user, scope, dto); }
  @Get() @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('farmerId') farmerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('slot') slot?: string, @Query('quality') quality?: string, @Query('search') search?: string) {
    return this.service.list(user, { farmerId, from, to, slot, quality, search });
  }
  @Get('daily-summary') @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  dailySummary(@GetUser() user: AuthenticatedUser, @Query('date') date?: string) { return this.service.dailySummary(user, date); }
  @Get('by-farmer/:farmerId') @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  byFarmer(@GetUser() user: AuthenticatedUser, @Param('farmerId') farmerId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.byFarmer(user, farmerId, { from, to });
  }
  @Post(':id/mark-paid') @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  markPaid(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SupplyPayDto) { return this.service.markPaid(user, id, dto?.paymentMethod); }
  @Post(':id/cancel') @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SupplyCancelDto) { return this.service.cancel(user, id, dto?.reason); }
  /** Kept for old screens: cancels the entry (never deletes it). */
  @Delete(':id') @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(user, id); }
}
