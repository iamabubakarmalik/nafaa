import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ReorderRulesService } from './reorder-rules.service';
import { UpsertReorderRuleDto } from './dto/upsert-reorder-rule.dto';

/** Reorder points: reading is the low-stock view, setting them is buying work. */
@ApiTags('Hardware - Reorder Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/reorder-rules')
export class ReorderRulesController {
  constructor(private readonly service: ReorderRulesService) {}

  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertReorderRuleDto) { return this.service.upsert(user, dto); }
  @RequirePermissions(PERMISSIONS.LOW_STOCK_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('needsReorder') needsReorder?: string) {
    return this.service.list(user, {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      needsReorder: needsReorder === 'true',
    });
  }
  @RequirePermissions(PERMISSIONS.LOW_STOCK_VIEW)
  @Get('low-stock-alerts') alerts(@GetUser() user: AuthenticatedUser) { return this.service.lowStockAlert(user); }
  @RequirePermissions(PERMISSIONS.LOW_STOCK_VIEW)
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @RequirePermissions(PERMISSIONS.LOW_STOCK_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  @Post(':id/mark-alerted') markAlerted(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markAlerted(user, id); }
  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
