import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ShoeTryOnService } from './try-on.service';
import { CompleteTryOnDto, CreateTryOnDto } from './dto/create-tryon.dto';

/** Size requests are taken and closed at the counter (pos.use). */
@ApiTags('Shoe - Size requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('shoe/try-on')
export class ShoeTryOnController {
  constructor(private readonly service: ShoeTryOnService) {}
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateTryOnDto) { return this.service.create(u, dto); }
  @Get() list(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('status') status?: string, @Query('search') search?: string) {
    return this.service.list(u, shop, { status, search });
  }
  @Get('page') page(
    @GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope,
    @Query('view') view?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.service.page(u, shop, { view, search, page, limit });
  }
  @Get('summary') summary(@GetUser() u: AuthenticatedUser) { return this.service.summary(u); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  /** The customer was told the size has come. */
  @Post(':id/notified') notified(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.notified(u, id); }
  @Post(':id/complete') complete(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteTryOnDto) {
    return this.service.complete(u, id, dto.purchased, dto.purchasedSize);
  }
  @Post(':id/cancel') cancel(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(u, id); }
  /** Kept for older screens: a request is cancelled, never deleted. */
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(u, id); }
}
