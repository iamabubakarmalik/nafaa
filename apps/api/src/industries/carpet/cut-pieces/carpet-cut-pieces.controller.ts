import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ShopIdParam } from '../../../common/shop-scope';
import { CarpetCutPiecesService } from './carpet-cut-pieces.service';
import { CreateCutPieceDto } from './dto/create-cut-piece.dto';
import { UpdateCutPieceDto } from './dto/update-cut-piece.dto';
import { QueryCutPiecesDto } from './dto/query-cut-pieces.dto';

/**
 * Cut pieces. Reading stays open (POS and bookings pick pieces). Adding a
 * piece by hand needs products.create, editing products.edit, selling
 * outside a bill pos.use, and writing one off stock_adjustments.manage.
 */
@ApiTags('Carpet Cut Pieces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carpet-cut-pieces')
export class CarpetCutPiecesController {
  constructor(private readonly service: CarpetCutPiecesService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCutPieceDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryCutPiecesDto) {
    return this.service.findAll(user, query);
  }

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.stats(user, shopId);
  }

  @Get('available')
  available(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.available(user, shopId);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCutPieceDto) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id/mark-sold')
  markSold(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { saleItemId?: string }) {
    return this.service.markSold(user, id, typeof body?.saleItemId === 'string' ? body.saleItemId : undefined);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
