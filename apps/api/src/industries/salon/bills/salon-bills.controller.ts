import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { SalonBillsService } from './salon-bills.service';
import { CreateSalonBillDto } from './dto/create-salon-bill.dto';

@ApiTags('Salon - Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/bills')
export class SalonBillsController {
  constructor(private readonly service: SalonBillsService) {}

  /** Counter bill: services with stylists and products used, retail products, tip, package and membership. */
  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateSalonBillDto) {
    return this.service.create(user, shop, dto);
  }

  /** What the counter needs about a customer: running membership and packages with sessions left. */
  @Get('perks') perks(@GetUser() user: AuthenticatedUser, @Query('customerId') customerId: string) {
    return this.service.perks(user, customerId);
  }
}
