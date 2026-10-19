import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { SubstitutesService } from './substitutes.service';
import { AddSubstituteDto } from './dto/add-substitute.dto';

@ApiTags('Pharmacy - Substitutes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/substitutes')
export class SubstitutesController {
  constructor(private readonly service: SubstitutesService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post() add(@GetUser() user: AuthenticatedUser, @Body() body: AddSubstituteDto) {
    return this.service.add(user, body.mainMedicineId, body.substituteMedicineId, body.notes);
  }
  @Get('by-main/:mainMedicineId') list(@GetUser() user: AuthenticatedUser, @Param('mainMedicineId') mainMedicineId: string) {
    return this.service.list(user, mainMedicineId);
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.findByProduct(user, productId);
  }
  @Get('auto-suggest/:productId') autoSuggest(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string) {
    return this.service.autoSuggest(user, shop, productId);
  }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
