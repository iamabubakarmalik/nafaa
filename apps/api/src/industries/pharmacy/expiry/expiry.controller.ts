import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ExpiryService } from './expiry.service';
import { ListExpiryDto } from './dto/list-expiry.dto';

/** Expiry list of the branch's batches; a stock record, so it needs products.view. */
@ApiTags('Pharmacy - Expiry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
@Controller('pharmacy/expiry')
export class ExpiryController {
  constructor(private readonly service: ExpiryService) {}

  @Get() list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListExpiryDto) {
    return this.service.list(user, shop, q);
  }

  @Get(':batchId/source') source(@GetUser() user: AuthenticatedUser, @Param('batchId') batchId: string) {
    return this.service.source(user, batchId);
  }
}
