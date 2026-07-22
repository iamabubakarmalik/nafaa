import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { MarketplaceHomeService } from './home.service';
import { DiscoverQueryDto } from './dto/discover-query.dto';
import { NearbyShopsDto } from './dto/nearby-shops.dto';
import { TrendingProductsDto } from './dto/trending-products.dto';

@ApiTags('Marketplace / Home')
@Controller('marketplace/home')
export class MarketplaceHomeController {
  constructor(private readonly svc: MarketplaceHomeService) {}

  /** Everything the home screen needs in ONE call (fast) */
  @Public()
  @Get('discover')
  @ApiOperation({ summary: 'Home screen aggregated feed' })
  discover(@Query() dto: DiscoverQueryDto, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.discover(dto, customerId);
  }

  @Public()
  @Get('nearby-shops')
  @ApiOperation({ summary: 'Nearby shops with distance calculation' })
  nearbyShops(@Query() dto: NearbyShopsDto) {
    return this.svc.getNearbyShops(dto);
  }

  @Public()
  @Get('trending-products')
  @ApiOperation({ summary: 'Trending products across marketplace' })
  trending(@Query() dto: TrendingProductsDto) {
    return this.svc.getTrendingProducts(dto);
  }

  @Public()
  @Get('search-suggestions')
  @ApiOperation({ summary: 'Autocomplete + recent searches' })
  suggestions(@Query('q') q: string, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.getSearchSuggestions(q ?? '', customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @Post('record-search')
  @ApiOperation({ summary: 'Record a search query in the customer\'s history' })
  recordSearch(
    @Req() req: Request,
    @Body() body: { query: string; resultCount?: number },
  ) {
    const customerId = (req as any).customer?.id as string;
    return this.svc.recordSearch(customerId, body.query, body.resultCount ?? 0);
  }
}
