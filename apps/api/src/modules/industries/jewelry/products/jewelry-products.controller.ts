import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { JewelryProductsService } from './jewelry-products.service';
import { UpsertJewelryProductDto } from './dto/upsert-jewelry-product.dto';

@ApiTags('Jewelry - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/products')
export class JewelryProductsController {
  constructor(private readonly service: JewelryProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertJewelryProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      category: q.category, metalType: q.metalType, purity: q.purity, style: q.style, search: q.search,
      hasStones: q.hasStones === 'true' ? true : undefined,
      hasDiamond: q.hasDiamond === 'true' ? true : undefined,
      isBridalCollection: q.isBridalCollection === 'true' ? true : undefined,
      isFestivalSpecial: q.isFestivalSpecial === 'true' ? true : undefined,
      featured: q.featured === 'true' ? true : undefined,
      minWeight: q.minWeight ? Number(q.minWeight) : undefined,
      maxWeight: q.maxWeight ? Number(q.maxWeight) : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.byProduct(user, productId);
  }
  @Get(':id/current-price') currentPrice(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.priceAtCurrentRate(user, id);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
