import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MetalStockService } from './metal-stock.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Jewelry - Metal Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/metal-stock')
export class MetalStockController {
  constructor(private readonly service: MetalStockService) {}

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post() addEntry(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.addEntry(user, dto); }
  @RequirePermissions(PERMISSIONS.STOCK_MOVEMENTS_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      metalType: q.metalType, purity: q.purity, entryType: q.entryType,
      from: q.from, to: q.to, limit: q.limit ? Number(q.limit) : undefined,
    });
  }
  @RequirePermissions(PERMISSIONS.STOCK_MOVEMENTS_VIEW)
  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.page(user, { metalType: q.metalType, purity: q.purity, entryType: q.entryType, from: q.from, to: q.to, search: q.search, page: Number(q.page), limit: Number(q.limit) });
  }
  @RequirePermissions(PERMISSIONS.STOCK_MOVEMENTS_VIEW)
  @Get('balance') balance(@GetUser() user: AuthenticatedUser) { return this.service.currentBalance(user); }
  @RequirePermissions(PERMISSIONS.STOCK_MOVEMENTS_VIEW)
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, from, to);
  }
}
