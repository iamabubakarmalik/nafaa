import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { LiveAnimalsService } from './live-animals.service';

/** A mandi purchase is a supplier purchase; feed is an expense; the animal record is goods data. */
@ApiTags('Meat - Live Animals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/live-animals')
export class LiveAnimalsController {
  constructor(private readonly service: LiveAnimalsService) {}

  @Post('mandi') @RequirePermissions(P.PURCHASES_CREATE)
  mandi(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: unknown) { return this.service.mandi(user, scope, dto); }

  @Post() @RequirePermissions(P.PRODUCTS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: unknown) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(P.PRODUCTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('animalType') animalType?: string, @Query('isSlaughtered') isSlaughtered?: string, @Query('isSold') isSold?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      animalType, search,
      isSlaughtered: isSlaughtered === 'true' ? true : isSlaughtered === 'false' ? false : undefined,
      isSold: isSold === 'true' ? true : isSold === 'false' ? false : undefined,
    });
  }

  @Get('summary') @RequirePermissions(P.PRODUCTS_VIEW)
  summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @Get(':id') @RequirePermissions(P.PRODUCTS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(P.PRODUCTS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }

  @Post(':id/feed-cost') @RequirePermissions(P.EXPENSES_CREATE)
  addFeed(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: unknown) {
    return this.service.addFeedCost(user, scope, id, body);
  }

  /** Takes the animal off the list; its purchase and slaughter records stay. */
  @Delete(':id') @RequirePermissions(P.PRODUCTS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
