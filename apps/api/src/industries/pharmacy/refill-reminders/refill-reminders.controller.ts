import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RefillRemindersService } from './refill-reminders.service';
import { CreateRefillReminderDto } from './dto/create-refill-reminder.dto';

/** Refill reminders are counter follow-up work with the patient: pos.use. */
@ApiTags('Pharmacy - Refill Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('pharmacy/refill-reminders')
export class RefillRemindersController {
  constructor(private readonly service: RefillRemindersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateRefillReminderDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { status, customerId, from, to });
  }
  @Get('due-today') dueToday(@GetUser() user: AuthenticatedUser) { return this.service.dueToday(user); }
  @Patch(':id/mark-sent') markSent(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markSent(user, id); }
  @Patch(':id/acknowledge') ack(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.acknowledge(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
