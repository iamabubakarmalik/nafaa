import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS, hasPermission } from '../../common/constants/permissions.constants';
import { ListRecipesDto, ListRunsDto, ProduceDto, ReportQueryDto, ReverseRunDto, SaveRecipeDto } from './dto/manufacturing.dto';
import { ManufacturingService } from './manufacturing.service';
import { stripCostFigures } from './mask-costs';

/** Cost, margin and profit figures leave the response for staff without the cost permission. */
function maskCosts<T>(user: AuthenticatedUser, value: T): T {
  return hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW) ? value : stripCostFigures(value);
}

@ApiTags('Manufacturing')
@ApiBearerAuth()
@Controller('manufacturing')
export class ManufacturingController {
  constructor(private readonly service: ManufacturingService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_VIEW)
  async summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return maskCosts(user, await this.service.summary(user, shop));
  }

  @Get('report')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_VIEW)
  async report(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return maskCosts(user, await this.service.report(user, shop, q));
  }

  @Get('recipes')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_VIEW)
  async recipes(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListRecipesDto) {
    return maskCosts(user, await this.service.listRecipes(user, shop, q));
  }

  @Get('recipes/:productId')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_VIEW)
  async recipe(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string) {
    return maskCosts(user, await this.service.getRecipe(user, shop, productId));
  }

  @Put('recipes/:productId')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_MANAGE)
  async saveRecipe(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string, @Body() dto: SaveRecipeDto) {
    return maskCosts(user, await this.service.saveRecipe(user, shop, productId, dto));
  }

  @Delete('recipes/:productId')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_MANAGE)
  deleteRecipe(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.deleteRecipe(user, productId);
  }

  /** What a production would take and cost; nothing is saved. */
  @Post('preview')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_PRODUCE)
  async preview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: ProduceDto) {
    return maskCosts(user, await this.service.preview(user, shop, dto));
  }

  @Get('runs')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_VIEW)
  async runs(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListRunsDto) {
    return maskCosts(user, await this.service.listRuns(user, shop, q));
  }

  @Get('runs/:id')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_VIEW)
  async run(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return maskCosts(user, await this.service.getRun(user, id));
  }

  @Post('runs')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_PRODUCE)
  async produce(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: ProduceDto) {
    return maskCosts(user, await this.service.produce(user, shop, dto));
  }

  @Post('runs/:id/reverse')
  @RequirePermissions(PERMISSIONS.MANUFACTURING_PRODUCE)
  async reverse(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReverseRunDto) {
    return maskCosts(user, await this.service.reverse(user, id, dto));
  }

  /** Products made when sold; the counter lets them sell without stock of their own. */
  @Get('make-on-sale')
  makeOnSale(@GetUser() user: AuthenticatedUser) {
    return this.service.makeOnSaleIds(user);
  }
}
