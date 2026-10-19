import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { MenuItemsService } from './menu-items.service';
import { MenuBoardService } from './menu-board.service';
import {
  AddToMenuDto, AttachModifiersDto, BranchAvailabilityDto, BulkAvailabilityDto, MenuBoardQueryDto, SetAvailabilityDto, UpsertMenuItemDto,
} from './dto/upsert-menu-item.dto';

@ApiTags('Restaurant - Menu Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/menu-items')
export class MenuItemsController {
  constructor(private readonly service: MenuItemsService, private readonly board: MenuBoardService) {}

  @Post()
  upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMenuItemDto) {
    return this.service.upsert(user, dto);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query('available') available?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('chefSpecial') chefSpecial?: string,
    @Query('search') search?: string,
    @Query('serving') serving?: string,
  ) {
    return this.service.list(user, scope.shopId, {
      available: available === 'true' ? true : available === 'false' ? false : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      chefSpecial: chefSpecial === 'true' ? true : undefined,
      search,
      serving: serving === 'true',
    });
  }

  /** The menu page: products with menu, recipe and stock facts; filtered and paged here. */
  @Get('board')
  menuBoard(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: MenuBoardQueryDto) {
    return this.board.board(user, scope.shopId, q);
  }

  /** Dish sales and profit with menu-engineering classes. */
  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('days') days?: string) {
    const d = Math.min(Math.max(Math.trunc(Number(days) || 30), 1), 365);
    return this.board.analytics(user, scope.shopId, d);
  }

  @Get('by-product/:productId')
  byProduct(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('productId') productId: string) {
    return this.service.byProduct(user, scope.shopId, productId);
  }

  /** Several dishes on or off the menu at once (sold out, back in the morning). */
  @Post('availability')
  setMany(@GetUser() user: AuthenticatedUser, @Body() dto: BulkAvailabilityDto) { return this.service.setAvailableMany(user, dto.menuItemIds, dto.available); }

  /** "86" at this branch until a time (default: end of the business day), or back on. */
  @Post('branch-availability')
  setBranch(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: BranchAvailabilityDto) {
    return this.service.setBranchAvailability(user, scope.shopId, dto.menuItemIds, dto.available, dto.until);
  }

  /** Gives products a menu profile so the restaurant POS lists them. */
  @Post('add-to-menu')
  addToMenu(@GetUser() user: AuthenticatedUser, @Body() dto: AddToMenuDto) { return this.service.addToMenu(user, dto.productIds); }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/modifiers')
  attach(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AttachModifiersDto) {
    return this.service.attachModifiers(user, id, dto.modifierGroupIds);
  }

  @Post(':id/toggle-available')
  toggleAvailable(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleAvailable(user, id); }

  @Post(':id/availability')
  setAvailable(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetAvailabilityDto) {
    return this.service.setAvailable(user, id, dto.available);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
