import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminNotificationsService } from './admin-notifications.service';
import { CreateAdminNotificationDto } from './dto/create-notification.dto';
import { AdminArea, AdminPermission } from '../access/admin-access.decorators';
import type { AdminAccess } from '../access/admin-access';
import { allowedCategories } from './admin-notify.logic';

type AdminRequest = { adminAccess?: AdminAccess };

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('notifications')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly service: AdminNotificationsService) {}

  private allowed(req: AdminRequest) {
    return allowedCategories(req.adminAccess);
  }

  @Get()
  list(
    @Req() req: AdminRequest,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('severity') severity?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(
      {
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
        type,
        priority,
        severity,
        category,
        search,
        from,
        to,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      },
      this.allowed(req),
    );
  }

  @Get('unread-count')
  unreadCount(@Req() req: AdminRequest) {
    return this.service.unreadCount(this.allowed(req));
  }

  /** Live feed for the bell, toasts and desktop alerts (polled every ~15 s). */
  @Get('feed')
  feed(@Req() req: AdminRequest, @GetUser() user: AuthenticatedUser, @Query('since') since?: string) {
    return this.service.feed(user.id, this.allowed(req), since);
  }

  @Get('recent')
  recent(@Req() req: AdminRequest, @Query('limit') limit?: string) {
    return this.service.recent(this.allowed(req), limit ? Number(limit) : 10);
  }

  @Get('stats')
  stats(@Req() req: AdminRequest) {
    return this.service.stats(this.allowed(req));
  }

  /** The signed-in admin's own alert settings. */
  @Get('preferences')
  preferences(@GetUser() user: AuthenticatedUser) {
    return this.service.getPrefs(user.id);
  }

  /** Personal settings: anyone who can see notifications may change their own. */
  @Put('preferences')
  @AdminPermission('notifications.view')
  savePreferences(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.service.setPrefs(user.id, body);
  }

  @Post()
  create(@Body() dto: CreateAdminNotificationDto) {
    return this.service.create(dto);
  }

  @Patch(':id/read')
  markRead(@Req() req: AdminRequest, @GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markAsRead(id, user.id, this.allowed(req));
  }

  @Post('mark-all-read')
  markAllRead(@Req() req: AdminRequest, @GetUser() user: AuthenticatedUser, @Query('category') category?: string) {
    return this.service.markAllAsRead(user.id, this.allowed(req), category);
  }

  @Delete('clear/read')
  clearRead(@Req() req: AdminRequest) {
    return this.service.clearAllRead(this.allowed(req));
  }

  @Delete(':id')
  remove(@Req() req: AdminRequest, @Param('id') id: string) {
    return this.service.remove(id, this.allowed(req));
  }
}
