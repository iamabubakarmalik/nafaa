import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CancelTransferDto, CreateTransferDto, ListTransfersDto, ReceiveTransferDto } from './dto/create-transfer.dto';
import { TransfersService } from './transfers.service';

@ApiTags('Stock Transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListTransfersDto) {
    return this.service.list(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListTransfersDto) {
    return this.service.analytics(user, shop, q);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTransferDto) {
    return this.service.create(user, dto);
  }

  /** Optional per-line received quantities for a short delivery. */
  @Patch(':id/receive')
  receive(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReceiveTransferDto) {
    return this.service.receive(user, id, dto);
  }

  @Patch(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelTransferDto) {
    return this.service.cancel(user, id, dto);
  }
}
