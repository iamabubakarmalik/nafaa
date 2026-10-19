import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ApplianceSerialService } from './serial-tracking.service';
import { AssignSaleSerialsDto, BulkSerialDto, UpdateApplianceSerialDto, UpsertApplianceSerialDto } from './dto/upsert-serial.dto';

@ApiTags('Appliances - Serial Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/serial-tracking')
export class ApplianceSerialController {
  constructor(private readonly service: ApplianceSerialService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertApplianceSerialDto) {
    return this.service.create(user, dto);
  }

  /** Aik shipment ke saare serial ek sath. */
  @Post('bulk')
  bulk(@GetUser() user: AuthenticatedUser, @Body() dto: BulkSerialDto) {
    return this.service.bulkCreate(user, dto);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('installationStatus') installationStatus?: string,
    @Query('warranty') warranty?: 'active' | 'expiring' | 'expired',
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, {
      productId, status, installationStatus, warranty, search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Part of selling at the counter, so it follows the counter right. */
  @Post('assign-sale')
  @RequirePermissions(PERMISSIONS.POS_USE)
  assignSale(@GetUser() user: AuthenticatedUser, @Body() dto: AssignSaleSerialsDto) {
    return this.service.assignSale(user, dto);
  }

  /** Serial units on many bills at once, for the sales history (comma separated ids, up to 100). */
  @Get('for-sales')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  forSales(@GetUser() user: AuthenticatedUser, @Query('ids') ids?: string) {
    return this.service.forSales(user, (ids ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 100));
  }

  @Get('for-sale/:saleId')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  forSale(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.service.forSale(user, saleId);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  @Get('lookup/:code')
  lookup(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.service.lookupBySerial(user, code);
  }

  @Get('warranty-check/:code')
  warranty(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.service.warrantyCheck(user, code);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateApplianceSerialDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
