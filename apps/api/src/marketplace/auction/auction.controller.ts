import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceAuctionService } from './auction.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { ListAuctionsDto } from './dto/list-auctions.dto';

@ApiTags('Marketplace / Auction')
@Controller('marketplace/auctions')
export class MarketplaceAuctionController {
  constructor(private readonly svc: MarketplaceAuctionService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List live + scheduled auctions' })
  list(@Query() dto: ListAuctionsDto) {
    return this.svc.list(dto);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('my/bids')
  @ApiOperation({ summary: 'My bids across auctions' })
  myBids(
    @GetCustomer() c: AuthenticatedCustomer,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.myBids(c.id, +(limit ?? 20), +(offset ?? 0));
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('my/wins')
  @ApiOperation({ summary: 'Auctions I won' })
  myWins(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.myWins(c.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Auction detail with bid history (masked)' })
  detail(@Param('id') id: string, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.getDetail(id, customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post(':id/bid')
  @ApiOperation({ summary: 'Place a bid (with auto-bid + anti-snipe extension)' })
  bid(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.svc.placeBid(c.id, id, dto);
  }
}
