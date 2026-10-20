import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CarpentersService } from './carpenters.service';
import { PayCarpenterDto, UpsertCarpenterDto } from './dto/upsert-carpenter.dto';

/** Karigars are staff (manage = staff manage); the order screens read the list; pay is an expense. */
@ApiTags('Furniture - Carpenters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/carpenters')
export class CarpentersController {
  constructor(private readonly service: CarpentersService) {}

  @Post() @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCarpenterDto) { return this.service.create(user, dto); }

  @Get()
  list(@GetUser() user: AuthenticatedUser,
    @Query('active') active?: string,
    @Query('workshop') workshop?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      workshop, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }

  @Get('top')
  top(@GetUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.service.topPerformers(user, Math.min(Math.max(Number(limit) || 10, 1), 50));
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Get(':id/workload')
  workload(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.workload(user, id, from, to);
  }

  /** Pay from the drawer, saved as an expense. */
  @Post(':id/pay') @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  pay(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: PayCarpenterDto) {
    return this.service.pay(user, shop, id, dto);
  }

  @Patch(':id') @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCarpenterDto) { return this.service.update(user, id, dto); }

  /** Switches the karigar off; his jobs and pay stay. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
