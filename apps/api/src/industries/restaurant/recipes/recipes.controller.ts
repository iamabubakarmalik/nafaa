import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RecipesService } from './recipes.service';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';

@ApiTags('Restaurant - Recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRecipeDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser) { return this.service.list(user); }
  /** Which dish can still be made, and how many plates, from the branch stock. */
  @Get('cookability') cookability(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) { return this.service.cookability(user, scope.shopId); }
  /** Raw material used by recipes over the last days, next to purchases and stock. */
  @Get('usage') usage(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('days') days?: string) {
    const d = Math.min(Math.max(Math.trunc(Number(days) || 7), 1), 90);
    return this.service.usage(user, scope.shopId, d);
  }

  /** Re-costs every recipe at today's ingredient rates and updates each dish's cost. */
  @Post('refresh-costs') async refreshCosts(@GetUser() user: AuthenticatedUser) { return { updated: await this.service.refreshDishCosts(user.tenantId) }; }

  @Get('by-menu-item/:menuItemId') getByMenu(@GetUser() user: AuthenticatedUser, @Param('menuItemId') menuItemId: string) { return this.service.getByMenuItem(user, menuItemId); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
