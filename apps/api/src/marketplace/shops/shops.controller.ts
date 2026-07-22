import {
  Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceShopsService } from './shops.service';
import { ListShopsDto } from './dto/list-shops.dto';
import { ShopProductsDto } from './dto/shop-products.dto';
import { ShopReviewsQueryDto } from './dto/shop-reviews.dto';

@ApiTags('Marketplace / Shops')
@Controller('marketplace/shops')
export class MarketplaceShopsController {
  constructor(private readonly svc: MarketplaceShopsService) {}

  // ─── LIST ───
  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse shops with filters, sort, pagination' })
  list(@Query() dto: ListShopsDto, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.listShops(dto, customerId);
  }

  // ─── FOLLOWED (must come before dynamic slug route) ───
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('followed/list')
  @ApiOperation({ summary: 'Shops the current customer follows' })
  followed(
    @GetCustomer() c: AuthenticatedCustomer,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.getFollowedShops(c.id, +(limit ?? 20), +(offset ?? 0));
  }

  // ─── SHOP DETAIL by slug ───
  @Public()
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get shop detail by slug' })
  bySlug(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.getShopBySlug(
      slug, customerId,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
    );
  }

  // ─── SHOP DETAIL by id ───
  @Public()
  @Get(':shopId')
  @ApiOperation({ summary: 'Get shop detail by id' })
  byId(
    @Param('shopId') shopId: string,
    @Req() req: Request,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.getShopById(
      shopId, customerId,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
    );
  }

  // ─── SHOP PRODUCTS ───
  @Public()
  @Get(':shopId/products')
  @ApiOperation({ summary: 'Products of a specific shop (filters, sort, facets)' })
  products(@Param('shopId') shopId: string, @Query() dto: ShopProductsDto) {
    return this.svc.getShopProducts(shopId, dto);
  }

  // ─── SHOP REVIEWS ───
  @Public()
  @Get(':shopId/reviews')
  @ApiOperation({ summary: 'Reviews with rating distribution' })
  reviews(@Param('shopId') shopId: string, @Query() dto: ShopReviewsQueryDto) {
    return this.svc.getShopReviews(shopId, dto);
  }

  // ─── SHOP HOURS ───
  @Public()
  @Get(':shopId/hours')
  @ApiOperation({ summary: 'Working hours + currently-open status' })
  hours(@Param('shopId') shopId: string) {
    return this.svc.getShopHours(shopId);
  }

  // ─── SIMILAR SHOPS ───
  @Public()
  @Get(':shopId/similar')
  @ApiOperation({ summary: 'Similar shops (same industry / city)' })
  similar(@Param('shopId') shopId: string, @Query('limit') limit?: string) {
    return this.svc.getSimilarShops(shopId, +(limit ?? 10));
  }

  // ─── FOLLOW ───
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post(':shopId/follow')
  @ApiOperation({ summary: 'Follow shop' })
  follow(@GetCustomer() c: AuthenticatedCustomer, @Param('shopId') shopId: string) {
    return this.svc.followShop(c.id, shopId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Delete(':shopId/follow')
  @ApiOperation({ summary: 'Unfollow shop' })
  unfollow(@GetCustomer() c: AuthenticatedCustomer, @Param('shopId') shopId: string) {
    return this.svc.unfollowShop(c.id, shopId);
  }
}
