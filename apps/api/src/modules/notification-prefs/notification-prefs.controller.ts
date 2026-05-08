import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NotificationPrefsService } from './notification-prefs.service';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('notification-prefs')
export class NotificationPrefsController {
  constructor(private readonly service: NotificationPrefsService) {}

  @Get()
  get(@GetUser() user: AuthenticatedUser) {
    return this.service.get(user);
  }

  @Patch()
  update(@GetUser() user: AuthenticatedUser, @Body() data: any) {
    return this.service.update(user, data);
  }
}
