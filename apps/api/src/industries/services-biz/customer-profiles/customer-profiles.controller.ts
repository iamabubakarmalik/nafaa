import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CustomerProfilesService } from './customer-profiles.service';

@ApiTags('Service Business - Customer Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/customer-profiles')
export class CustomerProfilesController {
  constructor(private readonly service: CustomerProfilesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('vip') vip?: string, @Query('hasAmc') hasAmc?: string) {
    return this.service.list(user, {
      vip: vip === 'true' ? true : vip === 'false' ? false : undefined,
      hasAmc: hasAmc === 'true' ? true : hasAmc === 'false' ? false : undefined,
    });
  }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.byCustomer(user, customerId); }
}
