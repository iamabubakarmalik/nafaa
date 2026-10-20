import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ShopIdParam } from '../../../common/shop-scope';
import { CarpetBillsService } from './carpet-bills.service';

/** Roll cuts and piece sales on bills: settling them from stock is part of selling (pos.use). */
@ApiTags('Carpet Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carpet-bills')
export class CarpetBillsController {
  constructor(private readonly service: CarpetBillsService) {}

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get('unsettled')
  unsettled(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.unsettled(user, shopId);
  }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get('lines')
  lines(@GetUser() user: AuthenticatedUser, @Query('saleIds') saleIds?: string) {
    return this.service.lines(user, (saleIds ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':saleId/settle')
  settle(@GetUser() user: AuthenticatedUser, @Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.service.settle(user, saleId);
  }
}
