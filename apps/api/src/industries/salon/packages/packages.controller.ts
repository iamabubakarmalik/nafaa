import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { PackagesService } from './packages.service';
import { CancelPurchaseDto, CreatePackageDto, PurchaseDto, UpdatePackageDto, UseSessionDto } from './dto/package.dto';

@ApiTags('Salon - Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/packages')
export class PackagesController {
  constructor(private readonly service: PackagesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreatePackageDto) { return this.service.createPackage(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('featured') featured?: string) {
    return this.service.listPackages(user, {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
    });
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePackageDto) { return this.service.updatePackage(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.removePackage(user, id); }

  @Post('purchase') purchase(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: PurchaseDto) {
    return this.service.purchase(user, { ...dto, shopId: dto.shopId ?? shop.shopId ?? undefined });
  }
  @Get('purchases/list') purchases(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('search') search?: string) {
    return this.service.listPurchases(user, { status, customerId, search });
  }
  @Post('purchases/:id/use') use(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UseSessionDto) {
    return this.service.useSession(user, id, body.appointmentId);
  }
  @Post('purchases/:id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CancelPurchaseDto) {
    return this.service.cancelPurchase(user, id, body.reason);
  }
}
