import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/create-quotation.dto';

/**
 * Quotations (estimates). Reading them is sales work (sales.view); writing
 * one is counter work (pos.use). Converting happens by billing it, which
 * the sale itself checks.
 */
@ApiTags('Hardware - Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/quotations')
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateQuotationDto) { return this.service.create(user, shop, dto); }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('projectId') projectId?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, projectId, customerId, from, to, search });
  }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('tab') tab?: string, @Query('search') search?: string, @Query('from') from?: string, @Query('to') to?: string,
    @Query('projectId') projectId?: string, @Query('customerId') customerId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.page(user, shop, { tab, search, from, to, projectId, customerId, page: Number(page) || 1, limit: Number(limit) || 25 });
  }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.summary(user, shop); }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateQuotationStatusDto) { return this.service.updateStatus(user, id, dto); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/revise') revise(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateQuotationDto) { return this.service.revise(user, id, dto); }

  /** Closes the quotation as rejected; the record stays. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
