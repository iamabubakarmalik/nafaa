import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BirthdayRemindersService } from './birthday-reminders.service';
import { RecordGiftPurchaseDto, UpsertBirthdayReminderDto } from './dto/upsert-birthday.dto';

@ApiTags('Toy Store - Birthday Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('toystore/birthday-reminders')
export class BirthdayRemindersController {
  constructor(private readonly service: BirthdayRemindersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBirthdayReminderDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
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
  @Get('upcoming') upcoming(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.upcoming(user, days ? Number(days) : 30);
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/gift-suggestions') suggestions(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('limit') limit?: string) {
    return this.service.giftSuggestions(user, id, limit ? Number(limit) : 12);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertBirthdayReminderDto) { return this.service.update(user, id, dto); }
  @Post(':id/record-purchase') purchase(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordGiftPurchaseDto) {
    return this.service.recordPurchase(user, id, dto);
  }
  @Post(':id/mark-reminder-sent') sent(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markReminderSent(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
