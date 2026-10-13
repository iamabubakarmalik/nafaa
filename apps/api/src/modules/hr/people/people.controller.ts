import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { PeopleService } from './people.service';
import { SetStaffStatusDto } from './dto/set-staff-status.dto';

/**
 * Staff directory. Lives under `staff/` so it takes the staff permissions
 * (view to read, manage to write). Paths have two segments so they never
 * collide with `staff/:id` on the HR controller.
 */
@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff/people')
export class PeopleController {
  constructor(private readonly service: PeopleService) {}

  /* `staff/people` alone would be caught by `staff/:id`, hence `all`. */
  @Get('all')
  @ApiOperation({ summary: 'Everyone: login and HR record joined, with duty and today' })
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.service.list(user, scope);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Headcount, sales, attendance and logins for a period' })
  analytics(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.analytics(user, scope, from, to);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'One person by staff id or user id' })
  profile(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.profile(user, id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Working, on leave, suspended or left (HR record)' })
  setStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetStaffStatusDto) {
    return this.service.setStatus(user, id, dto.status, dto.endDate);
  }
}
