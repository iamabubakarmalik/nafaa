import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ReorderRulesService } from './reorder-rules.service';
import { UpsertReorderRuleDto } from './dto/upsert-reorder-rule.dto';

@ApiTags('Hardware - Reorder Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/reorder-rules')
export class ReorderRulesController {
  constructor(private readonly service: ReorderRulesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertReorderRuleDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('needsReorder') needsReorder?: string) {
    return this.service.list(user, {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      needsReorder: needsReorder === 'true',
    });
  }
  @Get('low-stock-alerts') alerts(@GetUser() user: AuthenticatedUser) { return this.service.lowStockAlert(user); }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/mark-alerted') markAlerted(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markAlerted(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
