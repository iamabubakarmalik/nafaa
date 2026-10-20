import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { GamingRentalsService } from './rentals.service';
import { CreateRentalDto, ReturnRentalDto, UpdateRentalStatusDto } from './dto/create-rental.dto';

@ApiTags('Gaming - Rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/rentals')
export class GamingRentalsController {
  constructor(private readonly service: GamingRentalsService) {}

  /** Renting out takes the rent: counter work. */
  @Post() @RequirePermissions(PERMISSIONS.POS_USE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateRentalDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string,
    @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(user, { status, customerId, from, to, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Post('mark-overdue') @RequirePermissions(PERMISSIONS.POS_USE)
  markOverdue(@GetUser() user: AuthenticatedUser) { return this.service.markOverdue(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/return') @RequirePermissions(PERMISSIONS.POS_USE)
  returnRental(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReturnRentalDto) { return this.service.returnRental(user, id, dto); }
  @Patch(':id/status') @RequirePermissions(PERMISSIONS.POS_USE)
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRentalStatusDto) { return this.service.updateStatus(user, id, dto); }
}
