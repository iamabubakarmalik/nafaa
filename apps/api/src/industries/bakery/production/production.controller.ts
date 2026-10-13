import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CompleteItemInput, PlanItemInput, ProductionService } from './production.service';

@ApiTags('Bakery - Production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/production')
export class ProductionController {
  constructor(private readonly service: ProductionService) {}

  @Post('plans') createPlan(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.createPlan(user, shop, dto); }
  @Get('plans') listPlans(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.listPlans(user, shop, { status, from, to });
  }
  @Get('today') today(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.today(user, shop); }

  /** What to bake on a business day (`date` = yyyy-mm-dd, today by default). */
  @Get('suggest') suggest(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('date') date?: string, @Query('days') days?: string) {
    return this.service.suggest(user, shop, date, days ? Number(days) : 14);
  }

  /** Planned, made and failed for a period of plan days. */
  @Get('insights') insights(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.insights(user, shop, from, to);
  }

  @Get('plans/:id') getPlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getPlan(user, id); }
  @Patch('plans/:id') updatePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.updatePlan(user, id, dto); }
  @Post('plans/:id/items') addItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { items: PlanItemInput[] }) { return this.service.addItems(user, id, body?.items); }
  @Post('plans/:id/start') startPlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.startPlan(user, id); }
  @Post('plans/:id/complete') completePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.completePlan(user, id); }

  @Patch('items/:itemId') updateItem(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string, @Body() dto: any) { return this.service.updateItem(user, itemId, dto); }
  @Delete('items/:itemId') removeItem(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string) { return this.service.removeItem(user, itemId); }
  @Post('items/:itemId/start-baking') startBaking(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string, @Body() body: { bakingTempC?: number; ovenNumber?: string }) {
    return this.service.startItemBaking(user, itemId, body?.bakingTempC, body?.ovenNumber);
  }
  @Post('items/:itemId/complete') completeItem(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('itemId') itemId: string, @Body() body: any) {
    return this.service.completeItem(user, shop, itemId, body as CompleteItemInput);
  }
}
