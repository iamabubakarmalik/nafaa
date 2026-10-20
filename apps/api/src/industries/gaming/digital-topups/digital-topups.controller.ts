import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { DigitalTopupsService } from './digital-topups.service';
import { AssignSaleDto, BulkCreateTopupDto, CreateTopupDto, RemoveTopupDto, SellTopupDto } from './dto/create-topup.dto';

@ApiTags('Gaming - Digital Topups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/digital-topups')
export class DigitalTopupsController {
  constructor(private readonly service: DigitalTopupsService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTopupDto) { return this.service.create(user, dto); }

  @Post('bulk') @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  bulk(@GetUser() user: AuthenticatedUser, @Body() dto: BulkCreateTopupDto) { return this.service.bulkCreate(user, dto); }

  @Get() @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('provider') provider?: string, @Query('redeemed') redeemed?: string, @Query('available') available?: string,
    @Query('status') status?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(user, {
      provider, search, status,
      redeemed: redeemed === 'true' ? true : redeemed === 'false' ? false : undefined,
      available: available === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('inventory') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  inventory(@GetUser() user: AuthenticatedUser) { return this.service.availableInventory(user); }

  /** Card kinds for the counter, each with its product. */
  @Get('counter') @RequirePermissions(PERMISSIONS.POS_USE)
  counter(@GetUser() user: AuthenticatedUser) { return this.service.counter(user); }

  /** Gives out the cards a counter bill sold and returns their codes. */
  @Post('assign-sale') @RequirePermissions(PERMISSIONS.POS_USE)
  assignSale(@GetUser() user: AuthenticatedUser, @Body() dto: AssignSaleDto) { return this.service.assignSale(user, dto.saleId); }

  @Get('summary') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @Get(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/sell') @RequirePermissions(PERMISSIONS.POS_USE)
  sell(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SellTopupDto) { return this.service.sell(user, id, dto); }

  @Post(':id/redeem') @RequirePermissions(PERMISSIONS.POS_USE)
  redeem(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markRedeemed(user, id); }

  @Post(':id/restore') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  restore(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.restore(user, id); }

  /** Takes an unsold card off stock; nothing is deleted. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RemoveTopupDto) { return this.service.remove(user, id, dto?.reason); }
}
