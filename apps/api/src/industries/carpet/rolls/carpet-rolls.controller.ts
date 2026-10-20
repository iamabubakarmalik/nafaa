import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ShopIdParam } from '../../../common/shop-scope';
import { CarpetRollsService } from './carpet-rolls.service';
import { CreateCarpetRollDto } from './dto/create-carpet-roll.dto';
import { UpdateCarpetRollDto } from './dto/update-carpet-roll.dto';
import { QueryRollsDto } from './dto/query-rolls.dto';
import { CutRollDto } from './dto/cut-roll.dto';
import { AdjustRollDto } from './dto/adjust-roll.dto';
import { BulkImportApplyDto, BulkImportPreviewDto, BulkOpeningDto } from './dto/bulk-import.dto';

/**
 * Carpet rolls. Reading stays open (POS, bookings and transfers read rolls).
 * A roll from a purchase needs purchases.create, an opening roll
 * products.create; size and rates need products.edit; cutting at the
 * counter needs pos.use; adjust, damage, finish and remove change stock by
 * hand and need stock_adjustments.manage.
 */
@ApiTags('Carpet Rolls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carpet-rolls')
export class CarpetRollsController {
  constructor(private readonly service: CarpetRollsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCarpetRollDto) {
    const need = dto.sourceType === 'PURCHASE' ? PERMISSIONS.PURCHASES_CREATE : PERMISSIONS.PRODUCTS_CREATE;
    if (!hasPermission(user.role, user.permissions, need)) {
      throw new ForbiddenException(dto.sourceType === 'PURCHASE' ? 'Purchase ki ijazat nahi' : 'Naya maal daalne ki ijazat nahi');
    }
    return this.service.create(user, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  @Post('bulk-opening')
  bulkOpening(@GetUser() user: AuthenticatedUser, @Body() body: BulkOpeningDto) {
    return this.service.bulkOpening(user, body.rolls);
  }

  @Post('product-summary')
  productSummary(@GetUser() user: AuthenticatedUser, @Body() body: { productIds?: string[] }) {
    return this.service.productSummary(user, Array.isArray(body?.productIds) ? body.productIds.slice(0, 2000) : undefined);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  @Post('bulk-import-preview')
  bulkImportPreview(@GetUser() user: AuthenticatedUser, @Body() body: BulkImportPreviewDto) {
    return this.service.bulkImportPreview(user, body.rows, body.shopId);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  @Post('bulk-import-apply')
  bulkImportApply(@GetUser() user: AuthenticatedUser, @Body() body: BulkImportApplyDto) {
    return this.service.bulkImportApply(user, body.rows, body.shopId);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryRollsDto) {
    return this.service.findAll(user, query);
  }

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string, @Query('lowFt') lowFt?: string) {
    return this.service.stats(user, shopId, lowFt ? Number(lowFt) || 10 : 10);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.summary(user, shopId);
  }

  @Get('low-remaining')
  lowRemaining(@GetUser() user: AuthenticatedUser, @Query('threshold') threshold?: string) {
    return this.service.lowRemaining(user, threshold ? Number(threshold) || 10 : 10);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCarpetRollDto) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/cut')
  cut(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CutRollDto) {
    return this.service.cut(user, id, dto);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post(':id/adjust')
  adjust(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdjustRollDto) {
    return this.service.adjust(user, id, dto);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Patch(':id/mark-damaged')
  markDamaged(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.markDamaged(user, id, typeof body?.reason === 'string' ? body.reason.slice(0, 300) : undefined);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Patch(':id/mark-finished')
  markFinished(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.markFinished(user, id, typeof body?.reason === 'string' ? body.reason.slice(0, 300) : undefined);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
