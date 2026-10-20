import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { WeddingContractsService } from './wedding-contracts.service';
import { CreateWeddingContractDto, RecordWeddingPaymentDto, UpdateContractStatusDto, UpdateWeddingContractDto } from './dto/create-contract.dto';

@ApiTags('Florist - Wedding Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Contracts take advances and make bills: counter work, as the POS.
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('florist/wedding-contracts')
export class WeddingContractsController {
  constructor(private readonly service: WeddingContractsService) {}

  @Post() create(@GetUser() u: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: CreateWeddingContractDto) { return this.service.create(u, scope, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('search') search?: string,
  ) { return this.service.list(u, { status, upcoming: upcoming === 'true', search }); }
  @Get('paged') paged(
    @GetUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('upcoming') upcoming?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) { return this.service.paged(u, { status, search, from, to, upcoming: upcoming === 'true', page: Number(page) || 1, limit: Number(limit) || 25 }); }
  @Get('upcoming') upcoming(@GetUser() u: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.upcomingWeddings(u, days ? Number(days) : 30);
  }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateWeddingContractDto) { return this.service.update(u, id, dto); }
  @Patch(':id/status') status(@GetUser() u: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: UpdateContractStatusDto) { return this.service.updateStatus(u, scope, id, dto); }
  @Post(':id/payment') payment(@GetUser() u: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: RecordWeddingPaymentDto) { return this.service.recordPayment(u, scope, id, dto); }
  /** Cancels the contract; nothing is deleted. */
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
