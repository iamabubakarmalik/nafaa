import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceGroupBuyService } from './group-buy.service';
import { JoinGroupBuyDto } from './dto/join-group-buy.dto';
import { ListGroupBuysDto } from './dto/list-group-buys.dto';

@ApiTags('Marketplace / Group Buy')
@Controller('marketplace/group-buys')
export class MarketplaceGroupBuyController {
  constructor(private readonly svc: MarketplaceGroupBuyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active group buys' })
  list(@Query() dto: ListGroupBuysDto, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.listActive(dto, customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: 'My joined group buys' })
  my(
    @GetCustomer() c: AuthenticatedCustomer,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.myGroupBuys(c.id, +(limit ?? 20), +(offset ?? 0));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Group buy detail with participants' })
  detail(@Param('id') id: string, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.getDetail(id, customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post(':id/join')
  @ApiOperation({ summary: 'Join group buy — adds to cart at group price' })
  join(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: JoinGroupBuyDto,
  ) {
    return this.svc.join(c.id, id, dto);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave group buy (before order placed)' })
  leave(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.leave(c.id, id);
  }
}
