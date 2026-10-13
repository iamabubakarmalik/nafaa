/**
 * /notifications: the latest list (bell, mobile), the page feed, unread
 * count, read/unread/delete for one or many, push tokens and the low-stock
 * check. Every route only touches the caller's own and business-wide rows.
 */

import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NOTIFICATION_GROUPS, NotificationsService, type BulkAction, type NotificationGroup } from './notifications.service';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const asBool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

class FeedQueryDto {
  @IsOptional() @IsIn(NOTIFICATION_GROUPS) group?: NotificationGroup;
  @IsOptional() @Transform(asBool) @IsBoolean() unreadOnly?: boolean;
  @IsOptional() @Matches(DAY) from?: string;
  @IsOptional() @Matches(DAY) to?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(120) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

class BulkDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(500) @IsString({ each: true }) ids!: string[];
  @IsIn(['read', 'unread', 'delete']) action!: BulkAction;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /** Plain query reads (no DTO) so older clients sending extra params keep working. */
  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('limit') limit?: string, @Query('unreadOnly') unreadOnly?: string) {
    const n = Number(limit);
    return this.service.list(user, { limit: Number.isFinite(n) && n > 0 ? n : undefined, unreadOnly: asBool({ value: unreadOnly }) });
  }

  @Get('feed')
  feed(@GetUser() user: AuthenticatedUser, @Query() q: FeedQueryDto) {
    return this.service.feed(user, q);
  }

  @Get('unread-count')
  unreadCount(@GetUser() user: AuthenticatedUser) {
    return this.service.unreadCount(user);
  }

  @Patch(':id/read')
  markRead(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markAsRead(user, id);
  }

  @Patch(':id/unread')
  markUnread(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markAsUnread(user, id);
  }

  @Post('mark-all-read')
  markAllRead(@GetUser() user: AuthenticatedUser) {
    return this.service.markAllAsRead(user);
  }

  @Post('bulk')
  bulk(@GetUser() user: AuthenticatedUser, @Body() dto: BulkDto) {
    return this.service.bulk(user, dto.ids, dto.action);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.delete(user, id);
  }

  @Post('push-token')
  registerPushToken(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.service.registerPushToken(user.id, dto.token);
  }

  @Post('check-low-stock')
  async checkLowStock(@GetUser() user: AuthenticatedUser) {
    await this.service.checkLowStock(user.tenantId);
    return { message: 'Low stock check complete' };
  }
}
