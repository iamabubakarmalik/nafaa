import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { MarketplaceProductsService } from './products.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductReviewsQueryDto } from './dto/product-reviews.dto';

@ApiTags('Marketplace / Products')
@Controller('marketplace/products')
export class MarketplaceProductsController {
  constructor(private readonly svc: MarketplaceProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search + browse products across marketplace' })
  search(@Query() dto: SearchProductsDto, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.search(dto, customerId);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Category list with product counts' })
  categories() {
    return this.svc.listCategories();
  }

  @Public()
  @Get('categories/:name/sub')
  @ApiOperation({ summary: 'Sub-categories under a category' })
  subCategories(@Param('name') name: string) {
    return this.svc.listSubCategories(name);
  }

  @Public()
  @Get(':productId')
  @ApiOperation({ summary: 'Product detail (with variants, reviews, related, group buy, auction)' })
  detail(@Param('productId') productId: string, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.getProductDetail(productId, customerId);
  }

  @Public()
  @Get(':productId/reviews')
  @ApiOperation({ summary: 'Reviews with rating distribution & filters' })
  reviews(@Param('productId') productId: string, @Query() dto: ProductReviewsQueryDto) {
    return this.svc.getProductReviews(productId, dto);
  }

  @Public()
  @Get(':productId/price-compare')
  @ApiOperation({ summary: 'Same product at other shops (price compare)' })
  priceCompare(@Param('productId') productId: string) {
    return this.svc.priceCompare(productId);
  }
}
