import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { FarmersService } from './farmers.service';
import { FarmerPaymentDto, UpdateFarmerDto, UpsertFarmerDto } from './dto/upsert-farmer.dto';

/** Gawalas are the shop's milk suppliers: the supplier rights apply. */
@ApiTags('Dairy - Farmers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/farmers')
export class FarmersController {
  constructor(private readonly service: FarmersService) {}

  @Post() @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertFarmerDto) { return this.service.create(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('village') village?: string, @Query('active') active?: string) {
    return this.service.list(user, { search, village, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Get('summary') @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFarmerDto) { return this.service.update(user, id, dto); }
  @Post(':id/payments') @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: FarmerPaymentDto) { return this.service.recordPayment(user, id, dto); }
  /** Switches the gawala off; the account and its slips stay. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
