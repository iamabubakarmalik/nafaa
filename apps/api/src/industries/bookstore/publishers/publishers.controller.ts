import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PublishersService } from './publishers.service';
import { UpsertPublisherDto } from './dto/upsert-publisher.dto';

/** Publishers are catalog data (picked on a book); buying from one is supplier work. */
@ApiTags('Bookstore - Publishers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/publishers')
export class PublishersController {
  constructor(private readonly service: PublishersService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertPublisherDto) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('active') active?: string, @Query('country') country?: string) {
    return this.service.list(user, { search, country, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }

  /** Book costs for a purchase from this supplier (publisher discount on list price). */
  @Get('purchase-costs') @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  purchaseCosts(@GetUser() user: AuthenticatedUser, @Query('supplierId') supplierId?: string) { return this.service.purchaseCosts(user, supplierId); }

  @Post('seed-pakistani') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  seed(@GetUser() user: AuthenticatedUser) { return this.service.seedPakistaniPublishers(user); }

  @Get(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertPublisherDto) { return this.service.update(user, id, dto); }

  /** Opens or finds the publisher as a supplier, for purchases and returns. */
  @Post(':id/supplier') @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  openSupplier(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.openSupplier(user, id); }

  /** Switches the publisher off; its books keep it. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
