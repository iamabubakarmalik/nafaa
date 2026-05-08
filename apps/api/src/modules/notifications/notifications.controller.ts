import { Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Get('unread-count')
  unreadCount(@GetUser() user: AuthenticatedUser) {
    return this.service.unreadCount(user);
  }

  @Patch(':id/read')
  markRead(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markAsRead(user, id);
  }

  @Post('mark-all-read')
  markAllRead(@GetUser() user: AuthenticatedUser) {
    return this.service.markAllAsRead(user);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.delete(user, id);
  }

  @Post('check-low-stock')
  async checkLowStock(@GetUser() user: AuthenticatedUser) {
    await this.service.checkLowStock(user.tenantId);
    return { message: 'Low stock check complete' };
  }
}
