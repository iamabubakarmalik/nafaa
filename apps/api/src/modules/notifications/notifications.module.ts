import { Global, Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { PushModule } from '../push/push.module';
import { AlertPrefsService } from './alerts/alert-prefs.service';
import { StaffAlertsProcessor } from './alerts/staff-alerts.processor';
import { StaffAlertsService } from './alerts/staff-alerts.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TenantTimezoneService, StaffAlertsService, AlertPrefsService, StaffAlertsProcessor],
  exports: [NotificationsService, StaffAlertsService],
})
export class NotificationsModule {}
