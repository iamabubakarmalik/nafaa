import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AlterationsService } from './alterations.service';
import { AlterationPaymentDto, AlterationStatusDto, CreateAlterationDto } from './dto/create-alteration.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';

@ApiTags('Garments - Alterations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/alterations')
export class AlterationsController {
  constructor(private readonly service: AlterationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateAlterationDto) { return this.service.create(user, dto, shop.shopId); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('priority') priority?: string, @Query('customerId') customerId?: string, @Query('tailorId') tailorId?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, priority, customerId, tailorId, search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AlterationStatusDto) { return this.service.updateStatus(user, id, body.status, body.afterImageUrls, body.paymentMethod, body.paidNow); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AlterationPaymentDto) { return this.service.recordPayment(user, id, body.amount, body.paymentMethod); }
}
