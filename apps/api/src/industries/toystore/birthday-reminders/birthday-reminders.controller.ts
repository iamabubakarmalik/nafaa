import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BirthdayRemindersService } from './birthday-reminders.service';
import { RecordGiftPurchaseDto, UpsertBirthdayReminderDto } from './dto/upsert-birthday.dto';

/** Birthday reminders are customer records. */
@ApiTags('Toy Store - Birthday Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('toystore/birthday-reminders')
export class BirthdayRemindersController {
  constructor(private readonly service: BirthdayRemindersService) {}

  @Post() @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBirthdayReminderDto) { return this.service.create(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) list(@GetUser() user: AuthenticatedUser,
    @Query('active') active?: string,
    @Query('customerId') customerId?: string,
    @Query('gender') gender?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      customerId, gender, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get('upcoming') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) upcoming(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.upcoming(user, days ? Number(days) : 30);
  }
  @Get('summary') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/gift-suggestions') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) suggestions(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('limit') limit?: string) {
    return this.service.giftSuggestions(user, id, limit ? Number(limit) : 12);
  }
  @Patch(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertBirthdayReminderDto) { return this.service.update(user, id, dto); }
  @Post(':id/record-purchase') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) purchase(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordGiftPurchaseDto) {
    return this.service.recordPurchase(user, id, dto);
  }
  @Post(':id/mark-reminder-sent') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) sent(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markReminderSent(user, id); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
