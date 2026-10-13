import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ProductVariantsService } from './product-variants.service';
import { BulkVariantsDto, UpsertVariantDto } from './dto/upsert-variant.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';

@ApiTags('Product Variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products/:productId/variants')
export class ProductVariantsController {
  constructor(private readonly service: ProductVariantsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.list(user, productId);
  }

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: UpsertVariantDto,
    @CurrentShop() scope: ShopScope,
  ) {
    return this.service.create(user, productId, dto, scope);
  }

  @Post('bulk')
  bulkCreate(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() body: BulkVariantsDto,
    @CurrentShop() scope: ShopScope,
  ) {
    return this.service.bulkCreate(user, productId, body.variants, scope, body.shopId);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() dto: UpsertVariantDto,
    @CurrentShop() scope: ShopScope,
  ) {
    return this.service.update(user, productId, id, dto, scope);
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(user, productId, id);
  }
}
