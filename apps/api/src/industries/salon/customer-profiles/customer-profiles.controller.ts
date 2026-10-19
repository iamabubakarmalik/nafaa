import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CustomerProfilesService } from './customer-profiles.service';
import { UpsertCustomerProfileDto } from './dto/customer-profile.dto';

@ApiTags('Salon - Customer Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/customer-profiles')
export class CustomerProfilesController {
  constructor(private readonly service: CustomerProfilesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCustomerProfileDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string) { return this.service.list(user, { search }); }
  /** Salon customers (anyone with a visit or a profile), paged, with search and "not seen for" filter. */
  @Get('page') page(
    @GetUser() user: AuthenticatedUser,
    @Query('search') search?: string, @Query('view') view?: string, @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.service.page(user, { search, view, page, limit });
  }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.byCustomer(user, customerId); }
  /** Visits with services, stylists, notes and products used; packages and memberships. */
  @Get('by-customer/:customerId/history') history(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) {
    return this.service.history(user, customerId);
  }
}
