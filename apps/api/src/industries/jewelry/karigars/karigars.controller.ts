import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { KarigarsService } from './karigars.service';

/** Karigars are outside makers (supplier rights); gold given and taken back moves metal stock; paying labour is an expense. */
@ApiTags('Jewelry - Karigars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/karigars')
export class KarigarsController {
  constructor(private readonly service: KarigarsService) {}

  @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      skillLevel: q.skillLevel, search: q.search,
      isActive: q.isActive === 'true' ? true : q.isActive === 'false' ? false : undefined,
      isInHouse: q.isInHouse === 'true' ? true : q.isInHouse === 'false' ? false : undefined,
    });
  }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  @Get(':id/ledger') ledger(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.ledger(user, id); }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post(':id/issue-metal') issueMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.service.issueMetal(user, id, body ?? {});
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post(':id/receive-metal') receiveMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.service.receiveMetal(user, id, body ?? {});
  }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  @Post(':id/record-order') recordOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { earnings: number }) {
    return this.service.recordOrder(user, id, body.earnings);
  }

  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  @Post(':id/pay-labour') payLabour(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: any) {
    return this.service.payLabour(user, shop, id, body ?? {});
  }

  /** Switches the karigar off; history stays. */
  @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
