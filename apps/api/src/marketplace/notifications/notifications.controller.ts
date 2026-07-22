import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceNotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('Marketplace / Notifications')
@Controller('marketplace/notifications')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceNotificationsController {
  constructor(private readonly svc: MarketplaceNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications with type filter + unread counts' })
  list(@GetCustomer() c: AuthenticatedCustomer, @Query() dto: ListNotificationsDto) {
    return this.svc.list(c.id, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread count for badge' })
  count(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getUnreadCount(c.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.markRead(c.id, id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all (or by type) as read' })
  markAllRead(
    @GetCustomer() c: AuthenticatedCustomer,
    @Body() body?: { type?: string },
  ) {
    return this.svc.markAllRead(c.id, body?.type);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  delete(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.delete(c.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all / by-type / only-read notifications' })
  clear(
    @GetCustomer() c: AuthenticatedCustomer,
    @Body() body?: { onlyRead?: boolean; type?: string },
  ) {
    return this.svc.clearAll(c.id, body);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get channel preferences' })
  getPrefs(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getPreferences(c.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update channel preferences' })
  updatePrefs(
    @GetCustomer() c: AuthenticatedCustomer,
    @Body() body: { emails?: boolean; sms?: boolean; push?: boolean; whatsapp?: boolean },
  ) {
    return this.svc.updatePreferences(c.id, body);
  }
}
