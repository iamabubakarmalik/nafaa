import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminNotificationsService } from './admin-notifications.service';
import { CreateAdminNotificationDto } from './dto/create-notification.dto';

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly service: AdminNotificationsService) {}

  @Get()
  list(
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type,
      priority,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('unread-count')
  unreadCount() {
    return this.service.unreadCount();
  }

  @Get('recent')
  recent(@Query('limit') limit?: string) {
    return this.service.recent(limit ? Number(limit) : 10);
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Post()
  create(@Body() dto: CreateAdminNotificationDto) {
    return this.service.create(dto);
  }

  @Patch(':id/read')
  markRead(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markAsRead(id, user.id);
  }

  @Post('mark-all-read')
  markAllRead(@GetUser() user: AuthenticatedUser) {
    return this.service.markAllAsRead(user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Delete('clear/read')
  clearRead() {
    return this.service.clearAllRead();
  }
}
