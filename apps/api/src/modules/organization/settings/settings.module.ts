import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsCoreService } from './services/settings-core.service';
import { SettingsSecurityService } from './services/settings-security.service';
import { SettingsIntegrationsService } from './services/settings-integrations.service';
import { SettingsNotificationsService } from './services/settings-notifications.service';
import { SettingsBackupService } from './services/settings-backup.service';
import { SettingsDangerService } from './services/settings-danger.service';
import { DashboardModule } from '../../dashboard/dashboard.module';

@Module({
  // TenantTimezoneService yahan se aati hai — settings me waqt badle
  // to uska yaad kiya hua cache foran saaf karna hota hai
  imports: [DashboardModule],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    SettingsCoreService,
    SettingsSecurityService,
    SettingsIntegrationsService,
    SettingsNotificationsService,
    SettingsBackupService,
    SettingsDangerService,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
