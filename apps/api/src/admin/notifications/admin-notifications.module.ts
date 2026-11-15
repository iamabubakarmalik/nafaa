import { Global, Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotifyWatchService } from './admin-notify-watch.service';

/**
 * Admin notifications. Global so any module can inject the service; most code
 * calls notifyAdmins() from ./admin-notify instead and needs no injection.
 */
@Global()
@Module({
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService, AdminNotifyWatchService],
  exports: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
