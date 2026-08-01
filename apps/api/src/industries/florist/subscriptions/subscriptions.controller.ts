import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FloristSubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Florist - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('florist/subscriptions')
export class FloristSubscriptionsController {
  constructor(private readonly service: FloristSubscriptionsService) {}

  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateSubscriptionDto) { return this.service.create(u, dto); }
  @Get() list(@GetUser() u: AuthenticatedUser, @Query('status') status?: string, @Query('search') search?: string) {
    return this.service.list(u, { status, search });
  }
  @Get('summary') summary(@GetUser() u: AuthenticatedUser) { return this.service.summary(u); }
  @Get('due-today') due(@GetUser() u: AuthenticatedUser) { return this.service.dueToday(u); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Post(':id/mark-delivered') delivered(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.markDelivered(u, id); }
  @Post(':id/pause') pause(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.pause(u, id); }
  @Post(':id/resume') resume(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.resume(u, id); }
  @Post(':id/cancel') cancel(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(u, id); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
